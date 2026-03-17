import { z } from "zod";

export const ingredientSchema = z.object({
  item: z.string().min(1, "Ingredient item name is required"),
  amount: z.string().optional(),
  unit: z.string().optional(),
});

export const instructionSchema = z.object({
  step: z.number().int().positive().optional(),
  text: z.string().min(1, "Instruction text is required"),
});

export const nutritionSchema = z.object({
  calories: z.number().finite().positive().max(5000).optional(),
  protein: z.string().trim().optional(),
  carbs: z.string().trim().optional(),
  fat: z.string().trim().optional(),
});

export const recipeSchema = z.object({
  noRecipeFound: z.boolean().default(false),
  noRecipeReason: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  servings: z.union([z.number(), z.string()]).optional(),
  prepTime: z.union([z.number(), z.string()]).optional(),
  cookTime: z.union([z.number(), z.string()]).optional(),
  totalTime: z.union([z.number(), z.string()]).optional(),
  ingredients: z.array(ingredientSchema).optional(),
  instructions: z.array(instructionSchema).optional(),
  notes: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  nutrition: nutritionSchema.optional(),
});

export const extractionResponseSchema = recipeSchema.refine(
  (data) => {
    if (!data.noRecipeFound) {
      return !!data.title && !!data.ingredients && !!data.instructions;
    }
    return true;
  },
  {
    message:
      "Title, ingredients, and instructions are required when a recipe is found",
    path: ["title"],
  },
);

export type ExtractionResponse = z.infer<typeof extractionResponseSchema>;
