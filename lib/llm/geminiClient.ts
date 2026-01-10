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
const recipeSchema: ResponseSchema = {
  description: "Recipe extraction schema",
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "The name of the recipe",
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
    imageUrl: {
      type: SchemaType.STRING,
      description: "URL of a featured image for the recipe",
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
  required: ["title", "ingredients", "instructions"],
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
