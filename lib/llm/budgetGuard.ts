import { kv } from "@vercel/kv";
import { createLogger } from "@/lib/utils/logger";
import { retryWithBackoff } from "@/lib/utils/retry";

const logger = createLogger("LLM:BudgetGuard");

/**
 * Wraps KV calls with a timeout to prevent hanging the entire request.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 4000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("KV Operation Timeout")), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

const FALLBACK_MAX_MONTHLY_SPEND_USD = 10;
const AVG_OUTPUT_TOKENS = 900;
const inMemoryMonthlySpend = new Map<string, number>();

// USD per 1M tokens (input/output). Use conservative defaults where exact rates vary.
const DEFAULT_MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  "openai/gpt-4.1-mini": { inputPer1M: 0.4, outputPer1M: 1.6 },
  "qwen/qwen-2.5-7b-instruct": { inputPer1M: 0.2, outputPer1M: 0.2 },
  "google/gemma-3-27b-it:free": { inputPer1M: 0, outputPer1M: 0 },
  "meta-llama/llama-3.3-8b-instruct:free": { inputPer1M: 0, outputPer1M: 0 },
  "mistralai/mistral-7b-instruct:free": { inputPer1M: 0, outputPer1M: 0 },
};

function getMonthKey(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthlySpendKey(monthKey: string): string {
  return `llm:spend:${monthKey}`;
}

function parseNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getMonthlySpendCapUsd(): number {
  return parseNumberEnv("LLM_MAX_MONTHLY_SPEND_USD", FALLBACK_MAX_MONTHLY_SPEND_USD);
}

function getModelPricing(model: string): { inputPer1M: number; outputPer1M: number } {
  if (model.includes(":free") || model === "openrouter/free") {
    return { inputPer1M: 0, outputPer1M: 0 };
  }
  return DEFAULT_MODEL_PRICING[model] || { inputPer1M: 0.5, outputPer1M: 2.0 };
}

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(model);
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return Number((inputCost + outputCost).toFixed(6));
}

async function getCurrentSpendUsd(monthKey: string): Promise<number> {
  const spendKey = getMonthlySpendKey(monthKey);
  try {
    const value = await retryWithBackoff(
      () => withTimeout(kv.get<number>(spendKey)),
      { maxRetries: 1, initialDelayMs: 1000 },
      "BudgetGuard:Get"
    );
    if (typeof value === "number") return value;
  } catch (error) {
    logger.warn("Failed to read spend from KV, using in-memory fallback", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return inMemoryMonthlySpend.get(spendKey) || 0;
}

export async function canAffordEstimatedCall(
  model: string,
  promptLength: number
): Promise<{
  allowed: boolean;
  currentSpendUsd: number;
  estimatedCallCostUsd: number;
  capUsd: number;
}> {
  const monthKey = getMonthKey();
  const capUsd = getMonthlySpendCapUsd();
  const inputTokens = Math.ceil(promptLength / 4);
  const estimatedCallCostUsd = estimateCostUsd(model, inputTokens, AVG_OUTPUT_TOKENS);
  const currentSpendUsd = await getCurrentSpendUsd(monthKey);

  // Free models should always bypass cap checks.
  if (estimatedCallCostUsd === 0) {
    return {
      allowed: true,
      currentSpendUsd,
      estimatedCallCostUsd,
      capUsd,
    };
  }

  // If we can't get current spend due to KV errors, we assume allowed (fail-open)
  return {
    allowed: currentSpendUsd + estimatedCallCostUsd <= capUsd,
    currentSpendUsd,
    estimatedCallCostUsd,
    capUsd,
  };
}

export async function recordActualSpend(
  model: string,
  promptLength: number,
  totalTokensUsed: number
): Promise<number> {
  const monthKey = getMonthKey();
  const spendKey = getMonthlySpendKey(monthKey);
  const inputTokens = Math.ceil(promptLength / 4);
  const outputTokens = Math.max(totalTokensUsed - inputTokens, 0);
  const actualCost = estimateCostUsd(model, inputTokens, outputTokens);

  if (actualCost <= 0) {
    return 0;
  }

  try {
    const monthlyTtlSeconds = 45 * 24 * 60 * 60;
    const nextValue = await retryWithBackoff(
      async () => {
        const currentValue = (await withTimeout(kv.get<number>(spendKey))) || 0;
        const next = Number((currentValue + actualCost).toFixed(6));
        await withTimeout(kv.set(spendKey, next));
        await withTimeout(kv.expire(spendKey, monthlyTtlSeconds));
        return next;
      },
      { maxRetries: 1, initialDelayMs: 1000 },
      "BudgetGuard:Record"
    );

    logger.cost("Recorded monthly LLM spend", {
      modelUsed: model,
      estimatedCost: actualCost,
    });
    return nextValue;
  } catch (error) {
    const existing = inMemoryMonthlySpend.get(spendKey) || 0;
    const nextValue = Number((existing + actualCost).toFixed(6));
    inMemoryMonthlySpend.set(spendKey, nextValue);
    logger.warn("Failed to record spend in KV, updated in-memory fallback", {
      error: error instanceof Error ? error.message : String(error),
      spendKey,
      nextValue,
    });
    return nextValue;
  }
}
