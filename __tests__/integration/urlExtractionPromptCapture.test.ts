/** @jest-environment node */
import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { extractContentFromUrl } from "@/lib/api/extractContent";
import { buildRecipeExtractionPrompt } from "@/lib/llm/promptBuilder";
import { extractRecipeWithGemini } from "@/lib/llm/geminiClient";
import { parseRecipeFromLLMResponse } from "@/lib/llm/responseParser";
import { SourceType } from "@/types/recipe";
import {
  urlExtractionCases,
  UrlExtractionCase,
} from "@/__tests__/fixtures/urlExtractionCases";

jest.mock("@/lib/cache/cacheClient", () => ({
  ...jest.requireActual("@/lib/cache/cacheClient"),
  getCachedRecipe: jest.fn(async () => null),
}));

interface ExtractionArtifact {
  caseId: string;
  url: string;
  resolvedUrl?: string;
  timestamp: string;
  sourceType?: SourceType;
  model?: string;
  extractedContentLength?: number;
  extractedContentHash?: string;
  extractedContentPreview?: string;
  extractedContent?: string;
  prompt?: string;
  llmRawResponse?: string;
  parsed?: ReturnType<typeof parseRecipeFromLLMResponse>;
  error?: {
    stage: "extract" | "llm" | "parse" | "unexpected";
    message: string;
    details?: unknown;
  };
  timings: {
    extractMs: number;
    llmMs: number;
    totalMs: number;
  };
}

interface CaseSummary {
  index: number;
  caseId: string;
  url: string;
  status: "success" | "no-recipe" | "failed";
  artifactFile: string;
  errorMessage?: string;
  timings: {
    extractMs: number;
    llmMs: number;
    totalMs: number;
  };
}

function parsePositiveInt(envValue: string | undefined, fallback: number): number {
  const value = Number(envValue);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function nowTimestamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}${m}${day}-${hh}${mm}${ss}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function sanitizeCaseId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
}

function loadDotEnvLocalForTest(): void {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envLocalPath)) return;

  const raw = readFileSync(envLocalPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Ensure local env files (.env.local, etc.) are loaded for standalone test invocation.
loadEnvConfig(process.cwd());
// Explicitly load .env.local for this integration suite in test mode.
loadDotEnvLocalForTest();

const runSuite = isTruthy(process.env.RUN_LLM_URL_SUITE) && !!process.env.GEMINI_API_KEY;
const itIfEnabled = runSuite ? it : it.skip;
const model = process.env.LLM_URL_SUITE_MODEL || "gemini-3-flash-preview";
const delayMs = parsePositiveInt(process.env.LLM_URL_SUITE_DELAY_MS, 750);
const saveFullContent = process.env.LLM_URL_SUITE_SAVE_FULL_CONTENT === "true";
const enabledCases = urlExtractionCases.filter((c) => c.enabled !== false);

if (!runSuite) {
  // Visible guidance when the suite is skipped.
  // eslint-disable-next-line no-console
  console.warn(
    `[llm-url-suite] Skipping. RUN_LLM_URL_SUITE="${process.env.RUN_LLM_URL_SUITE || ""}" GEMINI_API_KEY present=${Boolean(process.env.GEMINI_API_KEY)}.`
  );
}

describe("url extraction prompt capture integration", () => {
  // Long timeout for real extraction + LLM calls across multiple URLs.
  jest.setTimeout(20 * 60 * 1000);

  itIfEnabled(
    "captures prompt + raw LLM output artifacts for each enabled URL case",
    async () => {
      if (enabledCases.length === 0) {
        throw new Error("No enabled URL cases found in __tests__/fixtures/urlExtractionCases.ts");
      }

      const runId = nowTimestamp();
      const runDir = path.join(process.cwd(), "tmp", "llm-extraction-runs", runId);
      await mkdir(runDir, { recursive: true });

      const summaries: CaseSummary[] = [];

      const request = {
        headers: new Headers({
          "user-agent": "llm-url-suite",
          "x-vercel-ip-country": "US",
          "x-vercel-ip-country-region": "CA",
        }),
      } as any;

      const manifest = {
        runId,
        createdAt: new Date().toISOString(),
        model,
        delayMs,
        saveFullContent,
        caseCount: enabledCases.length,
        env: {
          runFlag: process.env.RUN_LLM_URL_SUITE,
          hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
          modelEnv: process.env.LLM_URL_SUITE_MODEL || null,
          delayEnv: process.env.LLM_URL_SUITE_DELAY_MS || null,
          saveFullContentEnv: process.env.LLM_URL_SUITE_SAVE_FULL_CONTENT || null,
        },
        cases: enabledCases.map((c: UrlExtractionCase, index) => ({
          index: index + 1,
          id: c.id,
          url: c.url,
          notes: c.notes || null,
        })),
      };

      await writeFile(
        path.join(runDir, "manifest.json"),
        JSON.stringify(manifest, null, 2),
        "utf8"
      );

      for (const [index, testCase] of enabledCases.entries()) {
        const startedAt = Date.now();
        const caseId = sanitizeCaseId(testCase.id);
        const artifactFile = `${String(index + 1).padStart(2, "0")}-${caseId}.json`;
        const artifactPath = path.join(runDir, artifactFile);

        const artifact: ExtractionArtifact = {
          caseId,
          url: testCase.url,
          timestamp: new Date().toISOString(),
          timings: {
            extractMs: 0,
            llmMs: 0,
            totalMs: 0,
          },
        };

        let status: CaseSummary["status"] = "failed";
        let errorMessage: string | undefined;

        try {
          const extractStarted = Date.now();
          const extractionResult = await extractContentFromUrl(
            testCase.url,
            "127.0.0.1",
            false,
            startedAt,
            request
          );
          artifact.timings.extractMs = Date.now() - extractStarted;

          if ("response" in extractionResult) {
            const response = extractionResult.response;
            let responseBody: unknown = null;
            try {
              responseBody = await response.clone().json();
            } catch {
              responseBody = await response.text();
            }

            artifact.error = {
              stage: "extract",
              message: `Extraction returned early response (${response.status})`,
              details: responseBody,
            };
            errorMessage = artifact.error.message;
          } else {
            const extractedContent = extractionResult.content || "";
            const extractedHash = createHash("sha256")
              .update(extractedContent)
              .digest("hex");

            artifact.resolvedUrl = extractionResult.sourceUrl;
            artifact.sourceType = extractionResult.sourceType;
            artifact.extractedContentLength = extractedContent.length;
            artifact.extractedContentHash = extractedHash;
            artifact.extractedContentPreview = extractedContent.substring(0, 1200);
            if (saveFullContent) {
              artifact.extractedContent = extractedContent;
            }

            const prompt = buildRecipeExtractionPrompt(
              extractedContent,
              extractionResult.sourceType
            );
            artifact.prompt = prompt;
            artifact.model = model;

            const llmStarted = Date.now();
            const llmResponse = await extractRecipeWithGemini(
              extractedContent,
              prompt,
              model
            );
            artifact.timings.llmMs = Date.now() - llmStarted;
            artifact.llmRawResponse = llmResponse.content;
            artifact.model = llmResponse.model || model;

            const parsed = parseRecipeFromLLMResponse(llmResponse.content);
            artifact.parsed = parsed;

            if (parsed.noRecipeFound) {
              status = "no-recipe";
            } else if (parsed.success) {
              status = "success";
            } else {
              artifact.error = {
                stage: "parse",
                message: parsed.error || "Failed to parse LLM response",
                details: parsed,
              };
              errorMessage = artifact.error.message;
            }
          }
        } catch (error) {
          artifact.error = {
            stage: "unexpected",
            message: safeErrorMessage(error),
            details: error,
          };
          errorMessage = artifact.error.message;
        } finally {
          artifact.timings.totalMs = Date.now() - startedAt;
          await writeFile(artifactPath, JSON.stringify(artifact, null, 2), "utf8");

          summaries.push({
            index: index + 1,
            caseId,
            url: testCase.url,
            status,
            artifactFile,
            errorMessage,
            timings: artifact.timings,
          });
        }

        if (index < enabledCases.length - 1 && delayMs > 0) {
          await sleep(delayMs);
        }
      }

      const failed = summaries.filter((s) => s.status === "failed");
      const noRecipe = summaries.filter((s) => s.status === "no-recipe");
      const succeeded = summaries.filter((s) => s.status === "success");

      const summary = {
        runId,
        generatedAt: new Date().toISOString(),
        counts: {
          total: summaries.length,
          success: succeeded.length,
          noRecipe: noRecipe.length,
          failed: failed.length,
        },
        results: summaries,
      };

      await writeFile(
        path.join(runDir, "summary.json"),
        JSON.stringify(summary, null, 2),
        "utf8"
      );

      if (failed.length > 0) {
        const failureList = failed
          .map((f) => `${f.caseId}: ${f.errorMessage || "unknown error"}`)
          .join("\n");
        throw new Error(
          `LLM URL suite recorded ${failed.length} failure(s). Artifacts: ${runDir}\n${failureList}`
        );
      }
    }
  );
});
