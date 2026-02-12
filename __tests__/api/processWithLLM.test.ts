/** @jest-environment node */
import { NextResponse } from "next/server";
import { processContentWithLLM } from "@/lib/api/processWithLLM";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType } from "@/types/recipe";

jest.mock("@/lib/validators/recipeValidator", () => ({
  validateRecipe: jest.fn(),
  calculateConfidenceScore: jest.fn(),
}));

jest.mock("@/lib/llm/geminiClient", () => ({
  extractRecipeWithGemini: jest.fn(),
}));

jest.mock("@/lib/llm/responseParser", () => ({
  parseRecipeFromLLMResponse: jest.fn(),
}));

jest.mock("@/lib/llm/promptBuilder", () => ({
  buildRecipeExtractionPrompt: jest.fn(),
  buildFallbackPrompt: jest.fn(),
}));

jest.mock("@/lib/llm/modelSelector", () => ({
  selectModel: jest.fn(),
}));

jest.mock("@/lib/cache/cacheClient", () => ({
  setCachedRecipe: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  saveRecipeToLongTermStorage: jest.fn(),
}));

jest.mock("@/lib/utils/rateLimiter", () => ({
  incrementRateLimit: jest.fn(),
  getRequestCount: jest.fn(),
}));

jest.mock("@/lib/utils/logger", () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    perf: jest.fn(),
    cost: jest.fn(),
  })),
}));

import {
  validateRecipe,
  calculateConfidenceScore,
} from "@/lib/validators/recipeValidator";
import { extractRecipeWithGemini } from "@/lib/llm/geminiClient";
import { parseRecipeFromLLMResponse } from "@/lib/llm/responseParser";
import {
  buildRecipeExtractionPrompt,
  buildFallbackPrompt,
} from "@/lib/llm/promptBuilder";
import { selectModel } from "@/lib/llm/modelSelector";
import { setCachedRecipe } from "@/lib/cache/cacheClient";
import { saveRecipeToLongTermStorage } from "@/lib/db";
import { incrementRateLimit, getRequestCount } from "@/lib/utils/rateLimiter";

const mockValidateRecipe = validateRecipe as jest.MockedFunction<
  typeof validateRecipe
>;
const mockCalculateConfidenceScore =
  calculateConfidenceScore as jest.MockedFunction<typeof calculateConfidenceScore>;
const mockExtractRecipeWithGemini =
  extractRecipeWithGemini as jest.MockedFunction<typeof extractRecipeWithGemini>;
const mockParseRecipeFromLLMResponse =
  parseRecipeFromLLMResponse as jest.MockedFunction<
    typeof parseRecipeFromLLMResponse
  >;
const mockBuildRecipeExtractionPrompt =
  buildRecipeExtractionPrompt as jest.MockedFunction<
    typeof buildRecipeExtractionPrompt
  >;
const mockBuildFallbackPrompt = buildFallbackPrompt as jest.MockedFunction<
  typeof buildFallbackPrompt
>;
const mockSelectModel = selectModel as jest.MockedFunction<typeof selectModel>;
const mockSetCachedRecipe = setCachedRecipe as jest.MockedFunction<
  typeof setCachedRecipe
>;
const mockSaveRecipeToLongTermStorage =
  saveRecipeToLongTermStorage as jest.MockedFunction<
    typeof saveRecipeToLongTermStorage
  >;
const mockIncrementRateLimit = incrementRateLimit as jest.MockedFunction<
  typeof incrementRateLimit
>;
const mockGetRequestCount = getRequestCount as jest.MockedFunction<
  typeof getRequestCount
>;

const baseRecipe = {
  title: "Pasta",
  ingredients: [
    { item: "pasta", amount: "200", unit: "g" },
    { item: "oil", amount: "1", unit: "tbsp" },
    { item: "salt", amount: "1", unit: "tsp" },
  ],
  instructions: [
    { step: 1, text: "Boil water" },
    { step: 2, text: "Cook pasta" },
    { step: 3, text: "Season and serve" },
  ],
};

describe("processWithLLM", () => {
  const request = {
    headers: new Headers({
      "user-agent": "jest",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRequestCount.mockResolvedValue(3);
    mockSelectModel.mockReturnValue("gemini-2.5-flash-lite");
    mockBuildRecipeExtractionPrompt.mockReturnValue("prompt");
    mockBuildFallbackPrompt.mockReturnValue("fallback prompt");
    mockExtractRecipeWithGemini.mockResolvedValue({
      content: "{\"title\":\"Pasta\"}",
      tokensUsed: 120,
      model: "gemini-2.5-flash-lite",
    });
    mockParseRecipeFromLLMResponse.mockReturnValue({
      success: true,
      recipe: { ...baseRecipe },
    } as any);
    mockValidateRecipe.mockReturnValue({ isValid: true, errors: [] });
    mockCalculateConfidenceScore.mockReturnValue(88);
  });

  it("returns successful extraction response", async () => {
    const response = await processContentWithLLM(
      "recipe content",
      SourceType.BLOG,
      "1.1.1.1",
      "https://example.com/recipe",
      Date.now() - 25,
      request,
      false
    );

    expect(response.status).toBe(StatusCode.OK);
    const payload = await response.json();

    expect(payload.success).toBe(true);
    expect(payload.recipe.title).toBe("Pasta");
    expect(payload.recipe.confidenceScore).toBe(88);
    expect(payload.recipe.sourcePlatform).toBe(SourceType.BLOG);
    expect(payload.recipe.sourceUrl).toBe("https://example.com/recipe");
    expect(payload.metadata.modelUsed).toBe("gemini-2.5-flash-lite");
    expect(payload.metadata.tokensUsed).toBe(120);

    expect(mockSetCachedRecipe).toHaveBeenCalledWith(
      "https://example.com/recipe",
      expect.any(Object)
    );
    expect(mockSaveRecipeToLongTermStorage).toHaveBeenCalledTimes(1);
    expect(mockIncrementRateLimit).toHaveBeenCalledWith("1.1.1.1");
  });

  it("returns internal error when LLM call fails", async () => {
    mockExtractRecipeWithGemini.mockRejectedValue(new Error("LLM down"));

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.BLOG,
      "1.1.1.1",
      "",
      Date.now(),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.INTERNAL_SERVER_ERROR);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.INTERNAL_ERROR,
    });
  });

  it("returns bad request when parser indicates no recipe", async () => {
    mockParseRecipeFromLLMResponse.mockReturnValue({
      success: false,
      noRecipeFound: true,
      noRecipeReason: "Article is not about cooking",
    } as any);

    const response = await processContentWithLLM(
      "non recipe",
      SourceType.BLOG,
      "1.1.1.1",
      "",
      Date.now(),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.BAD_REQUEST);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.NO_RECIPE_FOUND,
      error: "Article is not about cooking",
    });
  });

  it("returns internal error when parser fails", async () => {
    mockParseRecipeFromLLMResponse.mockReturnValue({
      success: false,
      error: "Malformed JSON",
    } as any);

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.BLOG,
      "1.1.1.1",
      "",
      Date.now(),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.INTERNAL_SERVER_ERROR);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.VALIDATION_FAILED,
    });
  });

  it("uses fallback flow when initial validation fails and fallback succeeds", async () => {
    mockParseRecipeFromLLMResponse
      .mockReturnValueOnce({
        success: true,
        recipe: {
          title: "",
          ingredients: [],
          instructions: [],
        },
      } as any)
      .mockReturnValueOnce({
        success: true,
        recipe: { ...baseRecipe },
      } as any);

    mockValidateRecipe.mockReturnValue({
      isValid: false,
      errors: [{ field: "title", message: "required" }],
      missingTitle: true,
      missingIngredients: true,
      missingInstructions: true,
    });

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.TEXT,
      "2.2.2.2",
      "",
      Date.now(),
      request,
      true
    );

    expect(response.status).toBe(StatusCode.OK);
    const payload = await response.json();

    expect(mockBuildFallbackPrompt).toHaveBeenCalledTimes(1);
    expect(mockExtractRecipeWithGemini).toHaveBeenCalledTimes(2);
    expect(payload.success).toBe(true);
    expect(payload.recipe.isPartialFallback).toBe(true);
    expect(payload.recipe.fallbackFields).toEqual([
      "title",
      "ingredients",
      "instructions",
    ]);
    expect(payload.metadata.isFallback).toBe(true);
  });

  it("returns no-recipe error when fallback generation fails", async () => {
    mockParseRecipeFromLLMResponse.mockReturnValue({
      success: true,
      recipe: {
        title: "",
        ingredients: [],
        instructions: [],
      },
    } as any);

    mockValidateRecipe.mockReturnValue({
      isValid: false,
      errors: [{ field: "title", message: "required" }],
      missingTitle: true,
    });

    mockExtractRecipeWithGemini
      .mockResolvedValueOnce({
        content: "{\"title\":\"\"}",
        tokensUsed: 50,
        model: "gemini-2.5-flash-lite",
      })
      .mockRejectedValueOnce(new Error("fallback failed"));

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.TEXT,
      "2.2.2.2",
      "",
      Date.now(),
      request,
      true
    );

    expect(response.status).toBe(StatusCode.BAD_REQUEST);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.NO_RECIPE_FOUND,
    });
  });
});

