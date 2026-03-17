import { Recipe, LLMExtractionResponse } from "@/types/recipe";
import { createLogger } from "@/lib/utils/logger";
import { extractionResponseSchema } from "@/lib/validators/zodSchemas";
import { sanitizeNutrition } from "@/lib/validators/nutritionValidator";
import { fromZodError } from "zod-validation-error";

const logger = createLogger("LLM:ResponseParser");

export interface ParseResult {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  parseError?: boolean;
  noRecipeFound?: boolean;
  noRecipeReason?: string;
  validationError?: string;
}

export function parseRecipeFromLLMResponse(response: string): ParseResult {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleaned = response.trim();

    // Remove ```json and ``` markers
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Parse JSON, with recovery for model outputs that append extra text.
    const rawParsed = parseLLMJson(cleaned);

    // Pre-sanitize nutrition to prevent Zod from failing the entire recipe on a single macro error
    if (rawParsed && typeof rawParsed === "object" && (rawParsed as any).nutrition) {
      (rawParsed as any).nutrition = sanitizeNutrition((rawParsed as any).nutrition);
    }

    // Strict validation using Zod
    const zodResult = extractionResponseSchema.safeParse(rawParsed);

    if (!zodResult.success) {
      const validationError = fromZodError(zodResult.error).message;
      logger.error("Zod validation failed for LLM response", {
        error: validationError,
        rawResponse: response.substring(0, 500),
      });

      return {
        success: false,
        error: "Response failed schema validation",
        validationError,
      };
    }

    const parsed = zodResult.data;

    // Check if LLM indicated no recipe was found
    if (parsed.noRecipeFound === true) {
      return {
        success: false,
        noRecipeFound: true,
        noRecipeReason:
          parsed.noRecipeReason || "No recipe found in the provided content",
      };
    }

    // Ensure instructions have step numbers
    if (Array.isArray(parsed.instructions)) {
      parsed.instructions = parsed.instructions.map(
        (inst: any, index: number) => {
          if (typeof inst === "string") {
            return { step: index + 1, text: inst };
          }
          return { ...inst, step: inst.step || index + 1 };
        },
      );
    }

    // Ensure ingredients have proper structure
    if (Array.isArray(parsed.ingredients)) {
      parsed.ingredients = parsed.ingredients.map((ing: any) => {
        if (typeof ing === "string") {
          return { item: ing };
        }
        return ing;
      });
    }

    // Ensure mandatory metadata has defaults if missing
    if (!parsed.servings) parsed.servings = 4;

    // Convert string times to numbers if they exist (backward compatibility for cache)
    const parseTimeToMinutes = (time: any): number | undefined => {
      if (typeof time === "number") return time;
      if (typeof time !== "string") return undefined;

      // Extract first number found in string
      const match = time.match(/\d+/);
      if (match) {
        const value = parseInt(match[0], 10);
        // Handle "1 hour" -> 60
        if (
          time.toLowerCase().includes("hour") &&
          !time.toLowerCase().includes("15") &&
          !time.toLowerCase().includes("30") &&
          !time.toLowerCase().includes("45")
        ) {
          // Basic hour detection, if it's just "1 hour" or "2 hours"
          // But we should be careful. For now, let's keep it simple.
          // If "hour" is present and value is small, it's likely hours.
          if (value < 10) return value * 60;
        }
        return value;
      }
      return undefined;
    };

    if (parsed.prepTime !== undefined) {
      parsed.prepTime = parseTimeToMinutes(parsed.prepTime);
    }
    if (parsed.cookTime !== undefined) {
      parsed.cookTime = parseTimeToMinutes(parsed.cookTime);
    }
    if (parsed.totalTime !== undefined) {
      parsed.totalTime = parseTimeToMinutes(parsed.totalTime);
    }

    if (!parsed.prepTime) parsed.prepTime = 15;
    if (!parsed.cookTime) parsed.cookTime = 20;
    if (!parsed.totalTime) {
      parsed.totalTime = (parsed.prepTime || 0) + (parsed.cookTime || 0);
    }
    parsed.nutrition = sanitizeNutrition(parsed.nutrition);

    return {
      success: true,
      recipe: parsed as Recipe,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.warn("JSON parsing failed for LLM response", {
      error: errorMessage,
      rawResponse: response.substring(0, 500),
    });
    return {
      success: false,
      parseError: true,
      error: `Failed to parse LLM response: ${errorMessage}`,
    };
  }
}

export function extractJSONFromText(text: string): string | null {
  return findFirstBalancedJSONObject(text);
}

function parseLLMJson(text: string): LLMExtractionResponse {
  const candidates: string[] = [];
  const seen = new Set<string>();
  const pushCandidate = (value: string | null): void => {
    if (!value) return;
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  pushCandidate(text);
  const extracted = findFirstBalancedJSONObject(text);
  pushCandidate(extracted);

  // Attempt to repair truncated JSON if it looks cut off
  const repaired = attemptRepairTruncatedJSON(text);
  pushCandidate(repaired);

  const normalizedRaw = normalizeJsonLikeText(text);
  pushCandidate(normalizedRaw);
  pushCandidate(findFirstBalancedJSONObject(normalizedRaw));

  if (extracted) {
    pushCandidate(normalizeJsonLikeText(extracted));
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as LLMExtractionResponse;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to parse JSON response");
}

function normalizeJsonLikeText(text: string): string {
  return text
    .replace(/\uFEFF/g, "")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/,\s*([}\]])/g, "$1");
}

function findFirstBalancedJSONObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
      continue;
    }

    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

/**
 * Attempts to repair JSON that has been truncated (cut off mid-stream).
 * This is a best-effort recovery for long recipes that hit token limits.
 */
function attemptRepairTruncatedJSON(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let stack: ("{" | "[")[] = [];

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") {
      depth++;
      stack.push("{");
      continue;
    }
    if (ch === "[") {
      stack.push("[");
      continue;
    }
    if (ch === "}") {
      depth--;
      if (stack.length > 0 && stack[stack.length - 1] === "{") {
        stack.pop();
      }
      continue;
    }
    if (ch === "]") {
      if (stack.length > 0 && stack[stack.length - 1] === "[") {
        stack.pop();
      }
      continue;
    }
  }

  // If depth > 0, it's definitely truncated
  if (depth > 0 || inString || stack.length > 0) {
    let repaired = text.trim();

    // 1. Close open string
    if (inString) {
      repaired += '"';
    }

    // 2. Remove trailing comma if it exists (very common truncation point)
    repaired = repaired.replace(/,\s*$/, "");

    // 3. Close open arrays/objects in reverse order
    while (stack.length > 0) {
      const last = stack.pop();
      if (last === "{") repaired += "}";
      else if (last === "[") repaired += "]";
    }

    return repaired;
  }

  return null;
}
