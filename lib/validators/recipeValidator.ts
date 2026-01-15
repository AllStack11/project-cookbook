import {
  Recipe,
  RecipeValidationResult,
  ValidationError,
} from "@/types/recipe";

const HALLUCINATION_KEYWORDS = [
  "lorem ipsum",
  "placeholder",
  "example",
  "sample",
  "todo",
];

// Words/patterns that indicate an instruction rather than an ingredient
const INSTRUCTION_INDICATORS = [
  "heat",
  "cook",
  "stir",
  "mix",
  "combine",
  "add to",
  "place in",
  "put in",
  "bake",
  "boil",
  "simmer",
  "fry",
  "chop and add",
  "dice and",
  "slice and",
  "pour into",
  "transfer to",
  "remove from",
  "set aside",
  "let it",
  "allow to",
  "wait until",
  "continue",
  "repeat",
  "serve",
  "garnish with",
  "top with",
];

export function validateRecipe(recipe: Recipe): RecipeValidationResult {
  const errors: ValidationError[] = [];
  let missingTitle = false;
  let missingIngredients = false;
  let missingInstructions = false;

  // Check required fields
  if (!recipe.title || recipe.title.trim().length === 0) {
    missingTitle = true;
    errors.push({
      field: "title",
      message: "Recipe title is required",
    });
  }

  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    missingIngredients = true;
    errors.push({
      field: "ingredients",
      message: "Ingredients list is required",
    });
  } else if (recipe.ingredients.length < 2) {
    missingIngredients = true;
    errors.push({
      field: "ingredients",
      message: "Recipe must have at least 2 ingredients",
    });
  } else {
    // Validate each ingredient
    recipe.ingredients.forEach((ingredient, index) => {
      if (!ingredient.item || ingredient.item.trim().length === 0) {
        errors.push({
          field: `ingredients[${index}]`,
          message: `Ingredient at position ${index + 1} is missing item name`,
        });
      } else {
        // Check if ingredient looks like a cooking instruction
        if (looksLikeInstruction(ingredient.item)) {
          errors.push({
            field: `ingredients[${index}]`,
            message: `Ingredient "${ingredient.item}" appears to be a cooking instruction, not an ingredient`,
          });
        }

        // Check if ingredient is suspiciously long (likely a step)
        if (ingredient.item.length > 150) {
          errors.push({
            field: `ingredients[${index}]`,
            message: `Ingredient at position ${index + 1} is too long (${ingredient.item.length} chars). It may be a cooking step instead of an ingredient.`,
          });
        }

        // Check for multiple sentences (indicates it's likely a step)
        const sentenceCount = (ingredient.item.match(/[.!?]+\s/g) || []).length;
        if (sentenceCount > 1) {
          errors.push({
            field: `ingredients[${index}]`,
            message: `Ingredient "${ingredient.item.substring(0, 50)}..." contains multiple sentences and appears to be an instruction`,
          });
        }
      }
    });
  }

  if (!recipe.instructions || !Array.isArray(recipe.instructions)) {
    missingInstructions = true;
    errors.push({
      field: "instructions",
      message: "Instructions list is required",
    });
  } else if (recipe.instructions.length < 2) {
    missingInstructions = true;
    errors.push({
      field: "instructions",
      message: "Recipe must have at least 2 instruction steps",
    });
  } else {
    // Validate each instruction
    recipe.instructions.forEach((instruction, index) => {
      if (!instruction.text || instruction.text.trim().length === 0) {
        errors.push({
          field: `instructions[${index}]`,
          message: `Instruction step ${index + 1} is missing text`,
        });
      }
      if (instruction.step !== index + 1) {
        errors.push({
          field: `instructions[${index}]`,
          message: `Instruction step number mismatch at position ${index + 1}`,
        });
      }
    });
  }

  // Check for hallucinations/placeholder text
  const hasHallucination = detectHallucination(recipe);
  if (hasHallucination) {
    errors.push({
      field: "content",
      message: "Recipe contains placeholder or hallucinated content",
    });
  }

  // Validate servings if present
  // Validate mandatory metadata
  if (!recipe.servings || recipe.servings < 1 || recipe.servings > 100) {
    errors.push({
      field: "servings",
      message: "Valid servings (1-100) is required",
    });
  }

  if (recipe.prepTime === undefined || recipe.prepTime < 0) {
    errors.push({
      field: "prepTime",
      message: "Prep time is required and must be a non-negative number",
    });
  }

  if (recipe.cookTime === undefined || recipe.cookTime < 0) {
    errors.push({
      field: "cookTime",
      message: "Cook time is required and must be a non-negative number",
    });
  }

  if (recipe.totalTime === undefined || recipe.totalTime < 0) {
    errors.push({
      field: "totalTime",
      message: "Total time is required and must be a non-negative number",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingTitle,
    missingIngredients,
    missingInstructions,
  };
}

function detectHallucination(recipe: Recipe): boolean {
  // Check title
  if (containsHallucinationKeywords(recipe.title)) {
    return true;
  }

  // Check ingredients
  for (const ingredient of recipe.ingredients || []) {
    if (containsHallucinationKeywords(ingredient.item)) {
      return true;
    }
  }

  // Check instructions
  for (const instruction of recipe.instructions || []) {
    if (containsHallucinationKeywords(instruction.text)) {
      return true;
    }
  }

  // Check description
  if (recipe.description && containsHallucinationKeywords(recipe.description)) {
    return true;
  }

  return false;
}

function containsHallucinationKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return HALLUCINATION_KEYWORDS.some((keyword) => lowerText.includes(keyword));
}

/**
 * Checks if a supposed ingredient actually looks like a cooking instruction
 */
function looksLikeInstruction(text: string): boolean {
  const lowerText = text.toLowerCase().trim();

  // Check if it starts with an action verb (common in instructions)
  const startsWithVerb = INSTRUCTION_INDICATORS.some((indicator) =>
    lowerText.startsWith(indicator)
  );

  if (startsWithVerb) {
    return true;
  }

  // Check if it contains instruction phrases (not just at the start)
  // But be careful: "salt and pepper to taste" is valid, "add salt and pepper" is not
  const containsInstructionPhrase = INSTRUCTION_INDICATORS.some((indicator) => {
    // Only flag if the indicator appears at word boundaries
    const regex = new RegExp(`\\b${indicator}\\b`, "i");
    return regex.test(lowerText);
  });

  // If it contains instruction words AND is longer than typical ingredient descriptions
  if (containsInstructionPhrase && lowerText.length > 50) {
    return true;
  }

  return false;
}

export function isValidRecipe(recipe: Recipe): boolean {
  return validateRecipe(recipe).isValid;
}

/**
 * Calculate a confidence score (0-100) for recipe extraction quality
 * Uses a hybrid bonus/penalty model:
 * - Base score of 50 (average extraction)
 * - Bonuses for quality indicators
 * - Penalties for missing/incomplete data
 */
export function calculateConfidenceScore(recipe: Recipe): number {
  // Start with base score representing "average" extraction
  let score = 50;

  // === BONUSES (for good quality) ===

  // Title (+10 for having one)
  if (recipe.title && recipe.title.trim().length > 0) {
    score += 10;
  }

  // Description bonus (tiered based on quality)
  if (recipe.description && recipe.description.trim().length > 50) {
    score += 5; // Good description
  } else if (recipe.description && recipe.description.trim().length > 20) {
    score += 2; // Acceptable description
  }

  // Ingredients quality bonuses
  let detailRatio = 0;
  if (recipe.ingredients && recipe.ingredients.length >= 2) {
    score += 5; // Base for having valid ingredients

    const detailedIngredients = recipe.ingredients.filter(
      (ing) => ing.amount && ing.unit
    );
    detailRatio = detailedIngredients.length / recipe.ingredients.length;

    if (detailRatio >= 0.8) {
      score += 10; // Excellent detail
    } else if (detailRatio >= 0.5) {
      score += 5; // Good detail
    }
  }

  // Instructions quality bonuses
  let avgInstructionLength = 0;
  if (recipe.instructions && recipe.instructions.length >= 2) {
    score += 5; // Base for having valid instructions

    avgInstructionLength =
      recipe.instructions.reduce((sum, inst) => sum + inst.text.length, 0) /
      recipe.instructions.length;

    if (avgInstructionLength > 100) {
      score += 10; // Very detailed instructions
    } else if (avgInstructionLength > 50) {
      score += 5; // Good detail
    }
  }

  // Metadata bonuses (reduced from +5 to +3 each)
  if (recipe.servings && recipe.servings > 0) score += 3;
  if (recipe.prepTime !== undefined && recipe.prepTime > 0) score += 3;
  if (recipe.cookTime !== undefined && recipe.cookTime > 0) score += 3;
  if (recipe.totalTime !== undefined && recipe.totalTime > 0) score += 3;

  // Nutrition bonus
  if (recipe.nutrition) {
    let nutritionFields = 0;
    if (recipe.nutrition.calories) nutritionFields++;
    if (recipe.nutrition.protein) nutritionFields++;
    if (recipe.nutrition.carbs) nutritionFields++;
    if (recipe.nutrition.fat) nutritionFields++;
    score += Math.round((nutritionFields / 4) * 8);
  }

  // Notes bonus
  if (recipe.notes && recipe.notes.length > 0) {
    score += 3;
  }

  // === PENALTIES (for incomplete/poor quality) ===

  // Missing metadata penalties
  if (!recipe.servings || recipe.servings <= 0) {
    score -= 8;
  }
  if (recipe.prepTime === undefined || recipe.prepTime < 0) {
    score -= 6;
  }
  if (recipe.cookTime === undefined || recipe.cookTime < 0) {
    score -= 6;
  }
  if (recipe.totalTime === undefined || recipe.totalTime < 0) {
    score -= 5;
  }

  // Description penalty (missing is worse than short)
  if (!recipe.description || recipe.description.trim().length === 0) {
    score -= 5;
  } else if (recipe.description.trim().length < 20) {
    score -= 3;
  }

  // Ingredient detail penalty (only if we have ingredients)
  if (recipe.ingredients && recipe.ingredients.length >= 2) {
    if (detailRatio < 0.25) {
      score -= 12; // Very poor ingredient detail
    } else if (detailRatio < 0.5) {
      score -= 8; // Poor ingredient detail
    }
  }

  // Short instructions penalty (only if we have instructions)
  if (recipe.instructions && recipe.instructions.length >= 2) {
    if (avgInstructionLength < 20) {
      score -= 5; // Very terse instructions
    }
  }

  // Fallback/generated content penalties (increased severity)
  if (recipe.isGenerated) {
    score -= 20;
  }
  if (recipe.isPartialFallback) {
    score -= 12;
  }

  // Ensure score is within 0-100 range
  return Math.min(100, Math.max(0, score));
}
