import { Recipe } from '@/types/recipe';

export interface ParseResult {
  success: boolean;
  recipe?: Recipe;
  error?: string;
}

export function parseRecipeFromLLMResponse(response: string): ParseResult {
  try {
    // Clean the response - remove markdown code blocks if present
    let cleaned = response.trim();

    // Remove ```json and ``` markers
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    // Parse JSON
    const parsed = JSON.parse(cleaned);

    // Validate it looks like a recipe
    if (!parsed.title || !parsed.ingredients || !parsed.instructions) {
      return {
        success: false,
        error: 'Response does not contain required recipe fields',
      };
    }

    // Ensure instructions have step numbers
    if (Array.isArray(parsed.instructions)) {
      parsed.instructions = parsed.instructions.map((inst: any, index: number) => {
        if (typeof inst === 'string') {
          return { step: index + 1, text: inst };
        }
        return { ...inst, step: inst.step || index + 1 };
      });
    }

    // Ensure ingredients have proper structure
    if (Array.isArray(parsed.ingredients)) {
      parsed.ingredients = parsed.ingredients.map((ing: any) => {
        if (typeof ing === 'string') {
          return { item: ing };
        }
        return ing;
      });
    }

    return {
      success: true,
      recipe: parsed as Recipe,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
