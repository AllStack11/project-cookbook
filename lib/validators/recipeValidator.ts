import { Recipe, RecipeValidationResult, ValidationError } from '@/types/recipe';

const HALLUCINATION_KEYWORDS = [
  'lorem ipsum',
  'placeholder',
  'example',
  'sample',
  'todo',
  'tbd',
  'to be determined',
  'your ingredient here',
  'add your',
];

export function validateRecipe(recipe: Recipe): RecipeValidationResult {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!recipe.title || recipe.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Recipe title is required',
    });
  }

  if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    errors.push({
      field: 'ingredients',
      message: 'Ingredients list is required',
    });
  } else if (recipe.ingredients.length < 2) {
    errors.push({
      field: 'ingredients',
      message: 'Recipe must have at least 2 ingredients',
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
    errors.push({
      field: 'instructions',
      message: 'Instructions list is required',
    });
  } else if (recipe.instructions.length < 2) {
    errors.push({
      field: 'instructions',
      message: 'Recipe must have at least 2 instruction steps',
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
      field: 'content',
      message: 'Recipe contains placeholder or hallucinated content',
    });
  }

  // Validate servings if present
  if (recipe.servings !== undefined && (recipe.servings < 1 || recipe.servings > 100)) {
    errors.push({
      field: 'servings',
      message: 'Servings must be between 1 and 100',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
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
  return HALLUCINATION_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

export function isValidRecipe(recipe: Recipe): boolean {
  return validateRecipe(recipe).isValid;
}
