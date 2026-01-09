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

  if (!recipe.prepTime || recipe.prepTime.trim().length === 0) {
    errors.push({
      field: "prepTime",
      message: "Prep time is required",
    });
  }

  if (!recipe.cookTime || recipe.cookTime.trim().length === 0) {
    errors.push({
      field: "cookTime",
      message: "Cook time is required",
    });
  }

  if (!recipe.totalTime || recipe.totalTime.trim().length === 0) {
    errors.push({
      field: "totalTime",
      message: "Total time is required",
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
 * Higher scores indicate more complete and detailed recipes
 */
export function calculateConfidenceScore(recipe: Recipe): number {
  let score = 0;

  // Title (10 points)
  if (recipe.title && recipe.title.trim().length > 0) {
    score += 10;
  }

  // Description (5 points)
  if (recipe.description && recipe.description.trim().length > 20) {
    score += 5;
  }

  // Ingredients quality (25 points)
  if (recipe.ingredients && recipe.ingredients.length >= 2) {
    score += 10; // Base for having ingredients

    // Bonus for detailed ingredients with amounts and units
    const detailedIngredients = recipe.ingredients.filter(
      (ing) => ing.amount && ing.unit
    );
    const detailRatio = detailedIngredients.length / recipe.ingredients.length;
    score += Math.round(15 * detailRatio);
  }

  // Instructions quality (25 points)
  if (recipe.instructions && recipe.instructions.length >= 2) {
    score += 10; // Base for having instructions

    // Bonus for detailed instructions (longer text = more detail)
    const avgInstructionLength =
      recipe.instructions.reduce((sum, inst) => sum + inst.text.length, 0) /
      recipe.instructions.length;

    if (avgInstructionLength > 100) {
      score += 15;
    } else if (avgInstructionLength > 50) {
      score += 10;
    } else if (avgInstructionLength > 20) {
      score += 5;
    }
  }

  // Metadata completeness (20 points)
  if (recipe.servings && recipe.servings > 0) score += 5;
  if (recipe.prepTime && recipe.prepTime.trim().length > 0) score += 5;
  if (recipe.cookTime && recipe.cookTime.trim().length > 0) score += 5;
  if (recipe.totalTime && recipe.totalTime.trim().length > 0) score += 5;

  // Nutrition data (10 points)
  if (recipe.nutrition) {
    let nutritionFields = 0;
    if (recipe.nutrition.calories) nutritionFields++;
    if (recipe.nutrition.protein) nutritionFields++;
    if (recipe.nutrition.carbs) nutritionFields++;
    if (recipe.nutrition.fat) nutritionFields++;
    score += Math.round((nutritionFields / 4) * 10);
  }

  // Notes/Tips (5 points)
  if (recipe.notes && recipe.notes.length > 0) {
    score += 5;
  }

  // Deductions for fallback/generated content
  if (recipe.isGenerated) {
    score = Math.max(0, score - 15);
  }
  if (recipe.isPartialFallback) {
    score = Math.max(0, score - 10);
  }

  // Ensure score is within 0-100 range
  return Math.min(100, Math.max(0, score));
}
