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
  "tbd",
  "to be determined",
  "your ingredient here",
  "add your",
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

export function isValidRecipe(recipe: Recipe): boolean {
  return validateRecipe(recipe).isValid;
}
