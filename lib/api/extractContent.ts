import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import {
  validateUrl,
  isLikelyRecipeUrl,
} from "@/lib/validators/urlValidator";
import {
  extractYoutubeTranscript,
  extractYoutubeDescription,
} from "@/lib/extractors/youtubeExtractor";
import { extractStructuredRecipe } from "@/lib/extractors/webScraper";
import { getCachedRecipe } from "@/lib/cache/cacheClient";
import { validateInputContent } from "@/lib/validators/contentValidator";
import { resolveSearchEngineUrl } from "@/lib/utils/urlResolver";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType } from "@/types/recipe";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:ExtractContent");

export interface ExtractionResult {
  /** Extracted text content for LLM processing */
  content: string;
  sourceType: SourceType;
  sourceUrl: string;
}

export interface EarlyReturn {
  response: NextResponse;
}

/**
 * Handles URL validation, caching, and content extraction.
 * May return early with a cached recipe response.
 */
export async function extractContentFromUrl(
  url: string,
  ip: string,
  isSuspicious: boolean,
  overallStart: number,
  request: NextRequest
): Promise<ExtractionResult | EarlyReturn> {
  logger.info("Processing URL input", { url: url.substring(0, 100) });

  // Resolve search engine wrapper URLs (e.g. Bing/Google redirect links)
  const resolutionStart = Date.now();
  const resolvedUrlResult = await resolveSearchEngineUrl(url);
  logger.perf("URL resolution", Date.now() - resolutionStart);

  const effectiveUrl = resolvedUrlResult.resolvedUrl;
  if (resolvedUrlResult.wasResolved) {
    logger.info("Resolved search engine URL", {
      from: url.substring(0, 100),
      to: effectiveUrl.substring(0, 100),
      method: resolvedUrlResult.resolutionMethod,
    });
  }

  if (resolvedUrlResult.wasSearchEngine && !resolvedUrlResult.wasResolved) {
    return {
      response: NextResponse.json(
        {
          success: false,
          error:
            "Search-engine result URLs are not directly supported. Open the result and copy the final page URL (YouTube/watch page, blog post, etc.).",
          errorCode: ErrorCode.INVALID_URL,
        },
        { status: StatusCode.BAD_REQUEST }
      ),
    };
  }

  // Validate URL
  const urlValidationStart = Date.now();
  const urlValidation = validateUrl(effectiveUrl);
  logger.perf("URL validation", Date.now() - urlValidationStart);

  if (!urlValidation.isValid) {
    logger.warn("URL validation failed", { error: urlValidation.error });
    return {
      response: NextResponse.json(
        {
          success: false,
          error: urlValidation.error || "Invalid URL",
          errorCode: ErrorCode.INVALID_URL,
        },
        { status: StatusCode.BAD_REQUEST }
      ),
    };
  }

  let sourceType = urlValidation.sourceType!;
  logger.info("URL validated", {
    sourceType,
    videoId: urlValidation.videoId,
  });

  // Early URL pre-detection (soft check)
  const likelyRecipe = isLikelyRecipeUrl(effectiveUrl);
  if (!likelyRecipe && sourceType === SourceType.BLOG) {
    logger.info(
      "URL path does not strongly suggest a recipe, will perform deeper signal check after scraping"
    );
  }

  // Check cache (after URL validation)
  const cacheCheckStart = Date.now();
  const cachedRecipe = await getCachedRecipe(effectiveUrl);
  logger.perf("Cache check", Date.now() - cacheCheckStart);

  if (cachedRecipe) {
    logger.info("Cache HIT - returning cached recipe");
    logger.cost("Recipe served from cache", {
      cacheHit: true,
      modelUsed: "cached",
      tokensUsed: 0,
      estimatedCost: 0,
    });
    return {
      response: NextResponse.json({
        success: true,
        recipe: cachedRecipe,
        metadata: {
          cacheHit: true,
          modelUsed: "cached",
          processingTime: Date.now() - overallStart,
        },
      }),
    };
  }

  logger.info("Cache MISS - proceeding with extraction");

  let content = "";

  // Extract content based on source type
  if (sourceType === SourceType.YOUTUBE) {
    const result = await extractYoutubeContent(
      effectiveUrl,
      urlValidation.videoId!,
      ip,
      isSuspicious,
      overallStart,
      request
    );
    if ("response" in result) return result;
    content = result.content;
    sourceType = result.sourceType;
  } else {
    const result = await extractWebContent(
      effectiveUrl,
      sourceType,
      ip,
      isSuspicious,
      overallStart,
      request
    );
    if ("response" in result) return result;
    content = result.content;
    sourceType = result.sourceType;
  }

  return { content, sourceType, sourceUrl: effectiveUrl };
}

async function extractYoutubeContent(
  url: string,
  videoId: string,
  _ip: string,
  _isSuspicious: boolean,
  _overallStart: number,
  _request: NextRequest
): Promise<ExtractionResult | EarlyReturn> {
  logger.info("Extracting YouTube transcript", { videoId });
  const extractStart = Date.now();
  let result = await extractYoutubeTranscript(videoId);
  logger.perf("YouTube transcript extraction", Date.now() - extractStart);

  if (
    !result.success &&
    (result.error?.toLowerCase().includes("no transcript available") ||
      result.error?.toLowerCase().includes("transcript is disabled"))
  ) {
    logger.info("Transcript unavailable, falling back to description", {
      videoId,
    });
    const descStart = Date.now();
    result = await extractYoutubeDescription(videoId);
    logger.perf("YouTube description extraction", Date.now() - descStart);
  }

  if (!result.success) {
    logger.error("YouTube extraction failed", result.error);
    return {
      response: NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to extract YouTube content",
          errorCode: ErrorCode.EXTRACTION_FAILED,
        },
        { status: StatusCode.INTERNAL_SERVER_ERROR }
      ),
    };
  }

  let content = "";
  let sourceType = SourceType.YOUTUBE;

  // Check if YouTube description contains an external recipe link
  if (result.externalRecipeUrl) {
    logger.info(
      "YouTube description contains external recipe URL, following it",
      {
        videoId,
        externalUrl: result.externalRecipeUrl,
      }
    );

    const webStart = Date.now();
    const webResult = await extractStructuredRecipe(result.externalRecipeUrl);
    logger.perf("External recipe URL extraction", Date.now() - webStart);

    if (webResult.success && webResult.content) {
      logger.info("Using external recipe URL content for LLM extraction");
      content = webResult.content;
      sourceType = SourceType.BLOG;
    } else {
      logger.warn(
        "External recipe URL extraction failed, using YouTube description",
        { error: webResult.error }
      );
      content = result.content!;
    }
  } else {
    content = result.content!;
  }

  // Sanitize extracted content
  const contentCheck = validateInputContent(content);
  if (!contentCheck.isSafe) {
    logger.warn("Unsafe extracted content blocked", {
      reason: contentCheck.reason,
      url,
    });
    return {
      response: NextResponse.json(
        {
          success: false,
          error: "Extracted content contains restricted patterns.",
          errorCode: ErrorCode.EXTRACTION_FAILED,
        },
        { status: StatusCode.BAD_REQUEST }
      ),
    };
  }

  logger.info("YouTube content extracted", {
    contentLength: content.length,
    source: result.metadata?.videoId ? "transcript" : "description",
    hadExternalUrl: !!result.externalRecipeUrl,
  });

  return { content, sourceType, sourceUrl: url };
}

async function extractWebContent(
  url: string,
  sourceType: SourceType,
  _ip: string,
  _isSuspicious: boolean,
  _overallStart: number,
  _request: NextRequest
): Promise<ExtractionResult | EarlyReturn> {
  logger.info("Extracting web content");
  const scrapeStart = Date.now();

  logger.debug("Attempting structured data extraction");
  const result = await extractStructuredRecipe(url);
  logger.perf("Web extraction", Date.now() - scrapeStart);

  if (result.success && result.recipe) {
    logger.info("Structured data found, continuing to LLM extraction path");
  }

  if (!result.success) {
    logger.error("Web scraping failed", result.error);
    return {
      response: NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to scrape web content",
          errorCode: ErrorCode.EXTRACTION_FAILED,
        },
        { status: StatusCode.INTERNAL_SERVER_ERROR }
      ),
    };
  }

  const content = result.content!;

  // Sanitize extracted content
  const contentCheck = validateInputContent(content);
  if (!contentCheck.isSafe) {
    logger.warn("Unsafe extracted content blocked", {
      reason: contentCheck.reason,
      url,
    });
    return {
      response: NextResponse.json(
        {
          success: false,
          error: "Extracted content contains restricted patterns.",
          errorCode: ErrorCode.EXTRACTION_FAILED,
        },
        { status: StatusCode.BAD_REQUEST }
      ),
    };
  }

  logger.info("Web content extracted", {
    contentLength: content.length,
    title: result.metadata?.title?.substring(0, 50),
    hasRecipeSignals: result.metadata?.hasRecipeSignals,
  });

  // Hard pre-detection check for non-recipe pages
  if (
    sourceType === SourceType.BLOG &&
    !result.metadata?.hasRecipeSignals &&
    !isLikelyRecipeUrl(url)
  ) {
    logger.warn(
      "No recipe signals found in URL or page content. Rejecting before LLM call."
    );
    return {
      response: NextResponse.json(
        {
          success: false,
          error:
            "This URL doesn't appear to contain a recipe. Please try a different URL or paste the recipe text directly.",
          errorCode: ErrorCode.NO_RECIPE_FOUND,
        },
        { status: StatusCode.BAD_REQUEST }
      ),
    };
  }

  return { content, sourceType, sourceUrl: url };
}
