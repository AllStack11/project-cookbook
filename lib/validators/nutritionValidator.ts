import { Nutrition } from "@/types/recipe";

const VALID_NUTRITION_UNITS = /^(g|gram|grams|mg|kcal|cal)$/i;

function isPlaceholderNutritionToken(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return /^[a-z]+_g$/.test(normalized);
}

export function isValidNutritionMacroValue(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return false;

  if (isPlaceholderNutritionToken(normalized)) {
    return false;
  }

  if (!/\d/.test(normalized)) {
    return false;
  }

  const match = normalized.match(
    /^<?\s*(\d+(?:\.\d+)?)\s*([a-z]+)?\s*$/i
  );
  if (!match) {
    return false;
  }

  const unit = match[2];
  if (!unit) {
    return true;
  }

  return VALID_NUTRITION_UNITS.test(unit);
}

export function sanitizeNutrition(
  nutrition?: Nutrition
): Nutrition | undefined {
  if (!nutrition) return undefined;

  const sanitized: Nutrition = {};

  if (
    typeof nutrition.calories === "number" &&
    Number.isFinite(nutrition.calories) &&
    nutrition.calories > 0 &&
    nutrition.calories <= 5000
  ) {
    sanitized.calories = nutrition.calories;
  }

  if (
    typeof nutrition.protein === "string" &&
    isValidNutritionMacroValue(nutrition.protein)
  ) {
    sanitized.protein = nutrition.protein.trim();
  }

  if (
    typeof nutrition.carbs === "string" &&
    isValidNutritionMacroValue(nutrition.carbs)
  ) {
    sanitized.carbs = nutrition.carbs.trim();
  }

  if (
    typeof nutrition.fat === "string" &&
    isValidNutritionMacroValue(nutrition.fat)
  ) {
    sanitized.fat = nutrition.fat.trim();
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
