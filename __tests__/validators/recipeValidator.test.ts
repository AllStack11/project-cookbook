import {
  validateRecipe,
  isValidRecipe,
} from "@/lib/validators/recipeValidator";
import { Recipe } from "@/types/recipe";

describe("recipeValidator", () => {
  const validRecipe: Recipe = {
    title: "Chocolate Chip Cookies",
    description: "Delicious homemade cookies",
    servings: 24,
    prepTime: "15 minutes",
    cookTime: "12 minutes",
    totalTime: "27 minutes",
    ingredients: [
      { item: "all-purpose flour", amount: "2 1/4", unit: "cups" },
      { item: "butter", amount: "1", unit: "cup" },
      { item: "chocolate chips", amount: "2", unit: "cups" },
    ],
    instructions: [
      { step: 1, text: "Preheat oven to 375°F" },
      { step: 2, text: "Mix butter and sugar" },
      { step: 3, text: "Bake for 12 minutes" },
    ],
  };

  describe("validateRecipe", () => {
    it("should validate a correct recipe", () => {
      const result = validateRecipe(validRecipe);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject recipe without title", () => {
      const recipe = { ...validRecipe, title: "" };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "title",
        message: "Recipe title is required",
      });
    });

    it("should reject recipe without ingredients", () => {
      const recipe = { ...validRecipe, ingredients: [] };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "ingredients")).toBe(true);
    });

    it("should reject recipe with only 1 ingredient", () => {
      const recipe = {
        ...validRecipe,
        ingredients: [{ item: "flour", amount: "1", unit: "cup" }],
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "ingredients",
        message: "Recipe must have at least 2 ingredients",
      });
    });

    it("should reject recipe without instructions", () => {
      const recipe = { ...validRecipe, instructions: [] };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "instructions")).toBe(true);
    });

    it("should reject recipe with only 1 instruction", () => {
      const recipe = {
        ...validRecipe,
        instructions: [{ step: 1, text: "Mix everything" }],
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "instructions",
        message: "Recipe must have at least 2 instruction steps",
      });
    });

    it("should reject recipe with empty ingredient item", () => {
      const recipe = {
        ...validRecipe,
        ingredients: [
          { item: "flour", amount: "1", unit: "cup" },
          { item: "", amount: "2", unit: "cups" },
        ],
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "ingredients[1]")).toBe(
        true
      );
    });

    it("should reject recipe with empty instruction text", () => {
      const recipe = {
        ...validRecipe,
        instructions: [
          { step: 1, text: "Mix ingredients" },
          { step: 2, text: "" },
        ],
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "instructions[1]")).toBe(
        true
      );
    });

    it("should reject recipe with mismatched step numbers", () => {
      const recipe = {
        ...validRecipe,
        instructions: [
          { step: 1, text: "Mix ingredients" },
          { step: 3, text: "Bake" },
        ],
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "instructions[1]")).toBe(
        true
      );
    });

    it("should reject recipe with hallucination keywords in title", () => {
      const recipe = {
        ...validRecipe,
        title: "Lorem ipsum placeholder recipe",
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "content",
        message: "Recipe contains placeholder or hallucinated content",
      });
    });

    it("should reject recipe with hallucination keywords in ingredients", () => {
      const recipe = {
        ...validRecipe,
        ingredients: [
          { item: "flour", amount: "1", unit: "cup" },
          { item: "your ingredient here", amount: "2", unit: "cups" },
        ],
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "content")).toBe(true);
    });

    it("should reject recipe with hallucination keywords in instructions", () => {
      const recipe = {
        ...validRecipe,
        instructions: [
          { step: 1, text: "Mix ingredients" },
          { step: 2, text: "Add your example text here" },
        ],
      };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "content")).toBe(true);
    });

    it("should reject recipe with invalid servings", () => {
      const recipe = { ...validRecipe, servings: 150 };
      const result = validateRecipe(recipe);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "servings",
        message: "Valid servings (1-100) is required",
      });
    });

    it("should reject recipe missing mandatory metadata", () => {
      const recipe = {
        ...validRecipe,
        servings: undefined,
        prepTime: "",
        cookTime: "",
        totalTime: "",
      };
      const result = validateRecipe(recipe as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === "servings")).toBe(true);
      expect(result.errors.some((e) => e.field === "prepTime")).toBe(true);
      expect(result.errors.some((e) => e.field === "cookTime")).toBe(true);
      expect(result.errors.some((e) => e.field === "totalTime")).toBe(true);
    });
  });

  describe("isValidRecipe", () => {
    it("should return true for valid recipe", () => {
      expect(isValidRecipe(validRecipe)).toBe(true);
    });

    it("should return false for invalid recipe", () => {
      const recipe = { ...validRecipe, title: "" };
      expect(isValidRecipe(recipe)).toBe(false);
    });
  });
});
