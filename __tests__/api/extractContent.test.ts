/** @jest-environment node */
import { NextResponse } from "next/server";
import { extractContentFromUrl } from "@/lib/api/extractContent";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType } from "@/types/recipe";

jest.mock("@/lib/validators/urlValidator", () => ({
  validateUrl: jest.fn(),
  isLikelyRecipeUrl: jest.fn(),
}));

jest.mock("@/lib/validators/recipeValidator", () => ({
  validateRecipe: jest.fn(),
  calculateConfidenceScore: jest.fn(),
}));

jest.mock("@/lib/extractors/youtubeExtractor", () => ({
  extractYoutubeTranscript: jest.fn(),
  extractYoutubeDescription: jest.fn(),
}));

jest.mock("@/lib/extractors/webScraper", () => ({
  extractStructuredRecipe: jest.fn(),
}));

jest.mock("@/lib/cache/cacheClient", () => ({
  getCachedRecipe: jest.fn(),
  setCachedRecipe: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  saveRecipeToLongTermStorage: jest.fn(),
}));

jest.mock("@/lib/utils/rateLimiter", () => ({
  incrementRateLimit: jest.fn(),
}));

jest.mock("@/lib/validators/contentValidator", () => ({
  validateInputContent: jest.fn(),
}));

jest.mock("@/lib/utils/urlResolver", () => ({
  resolveSearchEngineUrl: jest.fn(),
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
  validateUrl,
  isLikelyRecipeUrl,
} from "@/lib/validators/urlValidator";
import {
  validateRecipe,
  calculateConfidenceScore,
} from "@/lib/validators/recipeValidator";
import {
  extractYoutubeTranscript,
  extractYoutubeDescription,
} from "@/lib/extractors/youtubeExtractor";
import { extractStructuredRecipe } from "@/lib/extractors/webScraper";
import { getCachedRecipe, setCachedRecipe } from "@/lib/cache/cacheClient";
import { saveRecipeToLongTermStorage } from "@/lib/db";
import { incrementRateLimit } from "@/lib/utils/rateLimiter";
import { validateInputContent } from "@/lib/validators/contentValidator";
import { resolveSearchEngineUrl } from "@/lib/utils/urlResolver";

const mockValidateUrl = validateUrl as jest.MockedFunction<typeof validateUrl>;
const mockIsLikelyRecipeUrl = isLikelyRecipeUrl as jest.MockedFunction<
  typeof isLikelyRecipeUrl
>;
const mockValidateRecipe = validateRecipe as jest.MockedFunction<
  typeof validateRecipe
>;
const mockCalculateConfidenceScore =
  calculateConfidenceScore as jest.MockedFunction<typeof calculateConfidenceScore>;
const mockExtractYoutubeTranscript =
  extractYoutubeTranscript as jest.MockedFunction<typeof extractYoutubeTranscript>;
const mockExtractYoutubeDescription =
  extractYoutubeDescription as jest.MockedFunction<
    typeof extractYoutubeDescription
  >;
const mockExtractStructuredRecipe =
  extractStructuredRecipe as jest.MockedFunction<typeof extractStructuredRecipe>;
const mockGetCachedRecipe = getCachedRecipe as jest.MockedFunction<
  typeof getCachedRecipe
>;
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
const mockValidateInputContent =
  validateInputContent as jest.MockedFunction<typeof validateInputContent>;
const mockResolveSearchEngineUrl =
  resolveSearchEngineUrl as jest.MockedFunction<typeof resolveSearchEngineUrl>;

describe("extractContent", () => {
  const request = {
    headers: new Headers({
      "user-agent": "jest",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
    }),
  } as any;

  const structuredRecipe = {
    title: "Soup",
    ingredients: [{ item: "water" }, { item: "salt" }, { item: "carrot" }],
    instructions: [
      { step: 1, text: "Boil" },
      { step: 2, text: "Season" },
      { step: 3, text: "Serve" },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveSearchEngineUrl.mockImplementation(async (inputUrl: string) => ({
      originalUrl: inputUrl,
      resolvedUrl: inputUrl,
      wasSearchEngine: false,
      wasResolved: false,
    }));
    mockValidateUrl.mockReturnValue({
      isValid: true,
      sourceType: SourceType.BLOG,
    } as any);
    mockIsLikelyRecipeUrl.mockReturnValue(true);
    mockGetCachedRecipe.mockResolvedValue(null);
    mockValidateInputContent.mockReturnValue({ isSafe: true });
    mockExtractStructuredRecipe.mockResolvedValue({
      success: true,
      content: "recipe page content",
      metadata: { hasRecipeSignals: true, title: "Soup" },
    } as any);
    mockValidateRecipe.mockReturnValue({ isValid: true, errors: [] });
    mockCalculateConfidenceScore.mockReturnValue(91);
  });

  it("returns bad request when URL validation fails", async () => {
    mockResolveSearchEngineUrl.mockResolvedValue({
      originalUrl: "not-a-url",
      resolvedUrl: "not-a-url",
      wasSearchEngine: false,
      wasResolved: false,
    });

    mockValidateUrl.mockReturnValue({
      isValid: false,
      error: "Invalid URL",
    } as any);

    const result = await extractContentFromUrl(
      "not-a-url",
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    expect("response" in result).toBe(true);
    const response = (result as any).response as NextResponse;
    expect(response.status).toBe(StatusCode.BAD_REQUEST);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.INVALID_URL,
    });
  });

  it("returns bad request for unresolved search engine wrapper URLs", async () => {
    const bingUrl =
      "https://www.bing.com/videos/riverview/relatedvideo?q=recipes&&mid=D60929DFF38B451D38E3D60929DFF38B451D38E3&FORM=VRDGAR";

    mockResolveSearchEngineUrl.mockResolvedValue({
      originalUrl: bingUrl,
      resolvedUrl: bingUrl,
      wasSearchEngine: true,
      wasResolved: false,
    });

    const result = await extractContentFromUrl(
      bingUrl,
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    expect("response" in result).toBe(true);
    const response = (result as any).response as NextResponse;
    expect(response.status).toBe(StatusCode.BAD_REQUEST);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.INVALID_URL,
    });
    expect(mockValidateUrl).not.toHaveBeenCalled();
  });

  it("returns cached recipe immediately on cache hit", async () => {
    mockGetCachedRecipe.mockResolvedValue({
      title: "Cached",
      ingredients: [],
      instructions: [],
    } as any);

    const result = await extractContentFromUrl(
      "https://example.com/recipe",
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    expect("response" in result).toBe(true);
    const payload = await (result as any).response.json();
    expect(payload.success).toBe(true);
    expect(payload.metadata.cacheHit).toBe(true);
    expect(mockExtractStructuredRecipe).not.toHaveBeenCalled();
  });

  it("falls back to YouTube description when transcript is unavailable", async () => {
    mockValidateUrl.mockReturnValue({
      isValid: true,
      sourceType: SourceType.YOUTUBE,
      videoId: "abc123",
    } as any);

    mockExtractYoutubeTranscript.mockResolvedValue({
      success: false,
      error: "No transcript available",
    } as any);

    mockExtractYoutubeDescription.mockResolvedValue({
      success: true,
      content: "description recipe",
      metadata: { videoId: "abc123" },
    } as any);

    const result = await extractContentFromUrl(
      "https://youtu.be/abc123",
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    expect("response" in result).toBe(false);
    expect(result).toMatchObject({
      content: "description recipe",
      sourceType: SourceType.YOUTUBE,
      sourceUrl: "https://youtu.be/abc123",
    });
  });

  it("uses external recipe URL content for LLM when structured data is present", async () => {
    mockValidateUrl.mockReturnValue({
      isValid: true,
      sourceType: SourceType.YOUTUBE,
      videoId: "abc123",
    } as any);

    mockExtractYoutubeTranscript.mockResolvedValue({
      success: true,
      content: "video description",
      externalRecipeUrl: "https://example.com/soup",
      metadata: { videoId: "abc123" },
    } as any);

    mockExtractStructuredRecipe.mockResolvedValue({
      success: true,
      recipe: structuredRecipe,
      content: "content",
      metadata: { hasRecipeSignals: true },
    } as any);

    const result = await extractContentFromUrl(
      "https://youtu.be/abc123",
      "1.1.1.1",
      true,
      Date.now() - 10,
      request
    );

    expect("response" in result).toBe(false);
    expect(result).toMatchObject({
      content: "content",
      sourceType: SourceType.BLOG,
      sourceUrl: "https://youtu.be/abc123",
    });

    expect(mockSetCachedRecipe).not.toHaveBeenCalled();
    expect(mockSaveRecipeToLongTermStorage).not.toHaveBeenCalled();
    expect(mockIncrementRateLimit).not.toHaveBeenCalled();
  });

  it("does not bypass LLM for blog structured data", async () => {
    mockValidateUrl.mockReturnValue({
      isValid: true,
      sourceType: SourceType.BLOG,
    } as any);

    mockExtractStructuredRecipe.mockResolvedValue({
      success: true,
      recipe: structuredRecipe,
      content: "structured blog recipe content",
      metadata: { hasRecipeSignals: true, title: "Soup" },
    } as any);

    const result = await extractContentFromUrl(
      "https://example.com/blog-recipe",
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    expect("response" in result).toBe(false);
    expect(result).toMatchObject({
      content: "structured blog recipe content",
      sourceType: SourceType.BLOG,
      sourceUrl: "https://example.com/blog-recipe",
    });

    expect(mockSetCachedRecipe).not.toHaveBeenCalled();
    expect(mockSaveRecipeToLongTermStorage).not.toHaveBeenCalled();
    expect(mockIncrementRateLimit).not.toHaveBeenCalled();
  });

  it("returns extraction failed when web scraping fails", async () => {
    mockExtractStructuredRecipe.mockResolvedValue({
      success: false,
      error: "Network failure",
    } as any);

    const result = await extractContentFromUrl(
      "https://example.com/recipe",
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    const response = (result as any).response as NextResponse;
    expect(response.status).toBe(StatusCode.INTERNAL_SERVER_ERROR);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.EXTRACTION_FAILED,
    });
  });

  it("blocks unsafe extracted web content", async () => {
    mockValidateInputContent.mockReturnValue({
      isSafe: false,
      reason: "restricted",
    });

    const result = await extractContentFromUrl(
      "https://example.com/recipe",
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    const response = (result as any).response as NextResponse;
    expect(response.status).toBe(StatusCode.BAD_REQUEST);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.EXTRACTION_FAILED,
    });
  });

  it("rejects blog pages with no recipe signals before LLM", async () => {
    mockIsLikelyRecipeUrl.mockReturnValue(false);
    mockExtractStructuredRecipe.mockResolvedValue({
      success: true,
      content: "general blog content",
      metadata: { hasRecipeSignals: false, title: "My Trip" },
    } as any);

    const result = await extractContentFromUrl(
      "https://example.com/travel-post",
      "1.1.1.1",
      false,
      Date.now(),
      request
    );

    const response = (result as any).response as NextResponse;
    expect(response.status).toBe(StatusCode.BAD_REQUEST);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: ErrorCode.NO_RECIPE_FOUND,
    });
  });
});

