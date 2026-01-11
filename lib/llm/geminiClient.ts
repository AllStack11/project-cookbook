import {
  GoogleGenerativeAI,
  SchemaType,
  ResponseSchema,
} from "@google/generative-ai";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("LLM:Gemini");

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

export interface GeminiResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

let genAI: GoogleGenerativeAI | null = null;

export function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// JSON Schema for Recipe extraction
// Note: We require noRecipeFound + either title/ingredients/instructions OR noRecipeReason
// Since Gemini doesn't support conditional requirements well, we make the key fields required
// and handle missing fields gracefully in the parser
const recipeSchema: ResponseSchema = {
  description: "Recipe extraction schema - either a full recipe or a noRecipeFound response",
  type: SchemaType.OBJECT,
  properties: {
    noRecipeFound: {
      type: SchemaType.BOOLEAN,
      description:
        "REQUIRED: Set to true if the content does not contain a complete recipe with ingredients AND cooking instructions. Set to false if a recipe is present. When true, you MUST provide noRecipeReason and MUST NOT provide recipe fields.",
    },
    noRecipeReason: {
      type: SchemaType.STRING,
      description:
        "REQUIRED when noRecipeFound is true. Explain why no recipe was found (e.g., 'Content is just a food photo caption without recipe details', 'Page contains only nutritional information', 'Post mentions food but provides no cooking instructions'). Keep it concise (1 sentence).",
    },
    title: {
      type: SchemaType.STRING,
      description: "REQUIRED when noRecipeFound is false. The name of the recipe.",
    },
    description: {
      type: SchemaType.STRING,
      description: "A brief summary of the dish",
    },
    servings: {
      type: SchemaType.NUMBER,
      description: "Number of servings",
    },
    prepTime: {
      type: SchemaType.NUMBER,
      description: "Preparation time in total minutes as an integer (e.g., 15)",
    },
    cookTime: {
      type: SchemaType.NUMBER,
      description: "Cooking time in total minutes as an integer (e.g., 30)",
    },
    totalTime: {
      type: SchemaType.NUMBER,
      description:
        "Total time in total minutes as an integer (sum of prep and cook, e.g., 45)",
    },
    ingredients: {
      type: SchemaType.ARRAY,
      description: "REQUIRED when noRecipeFound is false. List of recipe ingredients.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: { type: SchemaType.STRING },
          amount: { type: SchemaType.STRING },
          unit: { type: SchemaType.STRING },
        },
        required: ["item"],
      },
    },
    instructions: {
      type: SchemaType.ARRAY,
      description: "REQUIRED when noRecipeFound is false. Step-by-step cooking instructions.",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          step: { type: SchemaType.NUMBER },
          text: { type: SchemaType.STRING },
        },
        required: ["step", "text"],
      },
    },
    notes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    nutrition: {
      type: SchemaType.OBJECT,
      properties: {
        calories: { type: SchemaType.NUMBER },
        protein: { type: SchemaType.STRING },
        carbs: { type: SchemaType.STRING },
        fat: { type: SchemaType.STRING },
      },
    },
  },
  required: ["noRecipeFound"],
};

export async function extractRecipeWithGemini(
  content: string,
  prompt: string,
  modelName: string = "gemini-3-flash-preview",
  retryCount = 0
): Promise<GeminiResponse> {
  try {
    const genAI = getGeminiClient();

    // Only thinking/reasoning models support thinkingConfig
    // gemini-2.5-flash-lite does NOT support thinking features
    const supportsThinking = modelName.includes("thinking");

    const generationConfig: any = {
      responseMimeType: "application/json",
      responseSchema: recipeSchema,
      temperature: 1.0, // Recommended for Gemini 3
    };

    // Only add thinkingConfig for models that support it
    if (supportsThinking) {
      const thinkingLevel = content.length > 2000 ? "high" : "low";
      generationConfig.thinkingConfig = {
        thinkingLevel: thinkingLevel,
      };
    }

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig,
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Usage metadata
    const usage = response.usageMetadata || {
      promptTokenCount: 0,
      candidatesTokenCount: 0,
      totalTokenCount: 0,
    };

    return {
      content: text,
      tokensUsed: usage.totalTokenCount,
      model: modelName,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (retryCount < MAX_RETRIES) {
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(2, retryCount);
      logger.warn(`Gemini API call failed, retrying in \${backoffMs}ms...`, {
        error: errorMessage,
        retryCount,
      });
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return extractRecipeWithGemini(
        content,
        prompt,
        modelName,
        retryCount + 1
      );
    }

    logger.error("Failed to call Gemini API after retries", {
      error: errorMessage,
    });
    throw new Error(
      `Failed to call Gemini API after \${MAX_RETRIES} retries: \${errorMessage}`
    );
  }
}
