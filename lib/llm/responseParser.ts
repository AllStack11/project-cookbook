import { Recipe, LLMExtractionResponse } from "@/types/recipe";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("LLM:ResponseParser");

export interface ParseResult {
  success: boolean;
  recipe?: Recipe;
  error?: string;
  noRecipeFound?: boolean;
  noRecipeReason?: string;
}

export function parseRecipeFromLLMResponse(response: string): ParseResult {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleaned = response.trim();

    // Remove ```json and ``` markers
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Parse JSON
    const parsed: LLMExtractionResponse = JSON.parse(cleaned);

    // Check if LLM indicated no recipe was found
    if (parsed.noRecipeFound === true) {
      return {
        success: false,
        noRecipeFound: true,
        noRecipeReason:
          parsed.noRecipeReason || "No recipe found in the provided content",
      };
    }

    // Validate it looks like a recipe
    // If noRecipeFound is false or missing, we expect recipe fields
    if (!parsed.title || !parsed.ingredients || !parsed.instructions) {
      logger.error("Missing required fields in parsed response", {
        hasTitle: !!parsed.title,
        hasIngredients: !!parsed.ingredients,
        hasInstructions: !!parsed.instructions,
        noRecipeFound: parsed.noRecipeFound,
        actualKeys: Object.keys(parsed),
        rawResponse: response.substring(0, 200),
      });

      // Safety net: If noRecipeFound is explicitly false but we're missing fields,
      // treat it as if the LLM should have set noRecipeFound to true
      if (parsed.noRecipeFound === false) {
        return {
          success: false,
          noRecipeFound: true,
          noRecipeReason:
            parsed.noRecipeReason ||
            "LLM indicated content should have a recipe but failed to extract required fields (title, ingredients, or instructions)",
        };
      }

      return {
        success: false,
        error: "Response does not contain required recipe fields",
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
        }
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

    return {
      success: true,
      recipe: parsed as Recipe,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to parse LLM response: ${errorMessage}`,
    };
  }
}

export function extractJSONFromText(text: string): string | null {
  // Try to find JSON in text using regex
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}
