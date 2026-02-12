/** @jest-environment node */
import { processContentWithLLM } from "@/lib/api/processWithLLM";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType } from "@/types/recipe";
import { LLMProviderError } from "@/lib/llm/errors";

jest.mock("@/lib/validators/recipeValidator", () => ({
  validateRecipe: jest.fn(),
  calculateConfidenceScore: jest.fn(),
}));

jest.mock("@/lib/llm/provider", () => ({
  extractRecipe: jest.fn(),
}));

jest.mock("@/lib/llm/responseParser", () => ({
  parseRecipeFromLLMResponse: jest.fn(),
}));

jest.mock("@/lib/llm/promptBuilder", () => ({
  buildRecipeExtractionPrompt: jest.fn(),
  buildFallbackPrompt: jest.fn(),
}));

jest.mock("@/lib/llm/modelSelector", () => ({
  selectModelCandidates: jest.fn(),
}));

jest.mock("@/lib/llm/budgetGuard", () => ({
  canAffordEstimatedCall: jest.fn(),
  recordActualSpend: jest.fn(),
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
import { extractRecipe } from "@/lib/llm/provider";
import { parseRecipeFromLLMResponse } from "@/lib/llm/responseParser";
import {
  buildRecipeExtractionPrompt,
  buildFallbackPrompt,
} from "@/lib/llm/promptBuilder";
import { selectModelCandidates } from "@/lib/llm/modelSelector";
import { canAffordEstimatedCall, recordActualSpend } from "@/lib/llm/budgetGuard";
import { setCachedRecipe } from "@/lib/cache/cacheClient";
import { saveRecipeToLongTermStorage } from "@/lib/db";
import { incrementRateLimit, getRequestCount } from "@/lib/utils/rateLimiter";

const mockValidateRecipe = validateRecipe as jest.MockedFunction<typeof validateRecipe>;
const mockCalculateConfidenceScore =
  calculateConfidenceScore as jest.MockedFunction<typeof calculateConfidenceScore>;
const mockExtractRecipe = extractRecipe as jest.MockedFunction<typeof extractRecipe>;
const mockParseRecipeFromLLMResponse =
  parseRecipeFromLLMResponse as jest.MockedFunction<typeof parseRecipeFromLLMResponse>;
const mockBuildRecipeExtractionPrompt =
  buildRecipeExtractionPrompt as jest.MockedFunction<typeof buildRecipeExtractionPrompt>;
const mockBuildFallbackPrompt = buildFallbackPrompt as jest.MockedFunction<
  typeof buildFallbackPrompt
>;
const mockSelectModelCandidates =
  selectModelCandidates as jest.MockedFunction<typeof selectModelCandidates>;
const mockCanAffordEstimatedCall =
  canAffordEstimatedCall as jest.MockedFunction<typeof canAffordEstimatedCall>;
const mockRecordActualSpend = recordActualSpend as jest.MockedFunction<
  typeof recordActualSpend
>;
const mockSetCachedRecipe = setCachedRecipe as jest.MockedFunction<typeof setCachedRecipe>;
const mockSaveRecipeToLongTermStorage =
  saveRecipeToLongTermStorage as jest.MockedFunction<typeof saveRecipeToLongTermStorage>;
const mockIncrementRateLimit = incrementRateLimit as jest.MockedFunction<
  typeof incrementRateLimit
>;
const mockGetRequestCount = getRequestCount as jest.MockedFunction<typeof getRequestCount>;

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
    mockSelectModelCandidates.mockReturnValue([
      {
        attemptType: "free_primary",
        model: "openrouter/free",
        providerRouting: {
          sort: "throughput",
          require_parameters: true,
          allow_fallbacks: false,
        },
      },
      {
        attemptType: "paid_fallback",
        model: "qwen/qwen-2.5-7b-instruct",
      },
    ] as any);
    mockCanAffordEstimatedCall.mockResolvedValue({
      allowed: true,
      currentSpendUsd: 0,
      estimatedCallCostUsd: 0,
      capUsd: 10,
    });
    mockBuildRecipeExtractionPrompt.mockReturnValue("prompt");
    mockBuildFallbackPrompt.mockReturnValue("fallback prompt");
    mockExtractRecipe.mockResolvedValue({
      content: "{\"title\":\"Pasta\"}",
      tokensUsed: 120,
      model: "openrouter/free",
      provider: "openrouter",
    });
    mockParseRecipeFromLLMResponse.mockReturnValue({
      success: true,
      recipe: { ...baseRecipe },
    } as any);
    mockValidateRecipe.mockReturnValue({ isValid: true, errors: [] });
    mockCalculateConfidenceScore.mockReturnValue(88);
    mockRecordActualSpend.mockResolvedValue(0);
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
    expect(payload.metadata.modelUsed).toBe("openrouter/free");
    expect(payload.metadata.providerUsed).toBe("openrouter");
    expect(payload.metadata.tokensUsed).toBe(120);
    expect(payload.metadata.fallbackTierUsed).toBe("free_only");

    expect(mockSetCachedRecipe).toHaveBeenCalledWith(
      "https://example.com/recipe",
      expect.any(Object)
    );
    expect(mockSaveRecipeToLongTermStorage).toHaveBeenCalledTimes(1);
    expect(mockIncrementRateLimit).toHaveBeenCalledWith("1.1.1.1");
  });

  it("escalates to paid fallback on provider/runtime free failure", async () => {
    mockExtractRecipe
      .mockRejectedValueOnce(
        new LLMProviderError("rate limited", {
          code: "rate_limited",
          errorClass: "provider_runtime",
          retryable: true,
          statusCode: 429,
        })
      )
      .mockResolvedValueOnce({
        content: "{\"title\":\"Pasta\"}",
        tokensUsed: 100,
        model: "qwen/qwen-2.5-7b-instruct",
        provider: "openrouter",
      });

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.BLOG,
      "1.1.1.1",
      "",
      Date.now(),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.OK);
    const payload = await response.json();
    expect(payload.metadata.modelUsed).toBe("qwen/qwen-2.5-7b-instruct");
    expect(payload.metadata.fallbackTierUsed).toBe("paid_fallback");
    expect(payload.metadata.freeAttemptFailedReason).toBe("rate_limited");
    expect(mockExtractRecipe).toHaveBeenCalledTimes(2);
  });

  it("does not escalate to paid fallback on invalid free request errors", async () => {
    mockExtractRecipe.mockRejectedValueOnce(
      new LLMProviderError("invalid request", {
        code: "invalid_request",
        errorClass: "invalid_request",
        retryable: false,
        statusCode: 400,
      })
    );

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.BLOG,
      "1.1.1.1",
      "",
      Date.now(),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.SERVICE_UNAVAILABLE);
    expect(mockExtractRecipe).toHaveBeenCalledTimes(1);
  });

  it("returns service unavailable when all model attempts fail", async () => {
    mockCanAffordEstimatedCall.mockResolvedValue({
      allowed: false,
      currentSpendUsd: 10,
      estimatedCallCostUsd: 0.01,
      capUsd: 10,
    });

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.BLOG,
      "1.1.1.1",
      "",
      Date.now(),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.SERVICE_UNAVAILABLE);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.INTERNAL_ERROR,
    });
    expect(mockExtractRecipe).not.toHaveBeenCalled();
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

  it("runs self-correction when parser reports parseError", async () => {
    mockParseRecipeFromLLMResponse
      .mockReturnValueOnce({
        success: false,
        parseError: true,
        error: "Failed to parse LLM response: Unexpected token",
      } as any)
      .mockReturnValueOnce({
        success: true,
        recipe: { ...baseRecipe },
      } as any);

    mockExtractRecipe
      .mockResolvedValueOnce({
        content: "{invalid",
        tokensUsed: 90,
        model: "openrouter/free",
        provider: "openrouter",
      })
      .mockResolvedValueOnce({
        content: "{\"title\":\"Pasta\"}",
        tokensUsed: 30,
        model: "openrouter/free",
        provider: "openrouter",
      });

    const response = await processContentWithLLM(
      "recipe content",
      SourceType.BLOG,
      "1.1.1.1",
      "",
      Date.now(),
      request,
      false
    );

    expect(response.status).toBe(StatusCode.OK);
    expect(mockExtractRecipe).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
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
    expect(mockExtractRecipe).toHaveBeenCalledTimes(2);
    expect(payload.success).toBe(true);
    expect(payload.recipe.isPartialFallback).toBe(true);
    expect(payload.recipe.fallbackFields).toEqual(["title", "ingredients", "instructions"]);
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

    mockExtractRecipe
      .mockResolvedValueOnce({
        content: "{\"title\":\"\"}",
        tokensUsed: 50,
        model: "openrouter/free",
        provider: "openrouter",
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
