import { NextRequest, NextResponse } from "next/server";
import { validateUrl, isLikelyRecipeUrl } from "@/lib/validators/urlValidator";
import {
  validateRecipe,
  calculateConfidenceScore,
} from "@/lib/validators/recipeValidator";
import {
  extractYoutubeTranscript,
  extractYoutubeDescription,
} from "@/lib/extractors/youtubeExtractor";
import { extractRecipeWithGemini } from "@/lib/llm/geminiClient";
import { parseRecipeFromLLMResponse } from "@/lib/llm/responseParser";
import {
  buildRecipeExtractionPrompt,
  buildFallbackPrompt,
} from "@/lib/llm/promptBuilder";
import { selectModel } from "@/lib/llm/modelSelector";
import { getCachedRecipe, setCachedRecipe } from "@/lib/cache/cacheClient";
import { saveRecipeToLongTermStorage } from "@/lib/db";
import {
  checkRateLimit,
  incrementRateLimit,
  getRequestCount,
} from "@/lib/utils/rateLimiter";
import { isSuspiciousIP } from "@/lib/utils/vpnDetector";
import { validateInputContent } from "@/lib/validators/contentValidator";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType } from "@/types/recipe";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:Extract");

export async function POST(request: NextRequest) {
  const overallStart = Date.now();
  logger.info("=== Starting recipe extraction ===");

  try {
    // Parse request body
    const body = await request.json();
    const { url, text } = body;
    logger.debug("Request received", { hasUrl: !!url, hasText: !!text });

    // Validate input
    if (!url && !text) {
      logger.warn("Invalid input: neither URL nor text provided");
      return NextResponse.json(
        {
          success: false,
          error: "Either URL or text content is required",
          errorCode: ErrorCode.INVALID_INPUT,
        },
        { status: StatusCode.BAD_REQUEST }
      );
    }

    // Get IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    logger.debug("Client IP", { ip });

    // VPN/Suspicious IP Check
    const vpnCheckStart = Date.now();
    const { isSuspicious, reason: vpnReason } = await isSuspiciousIP(
      ip,
      request.headers
    );
    logger.perf("VPN check", Date.now() - vpnCheckStart);

    if (isSuspicious) {
      logger.info("Suspicious connection detected", { ip, vpnReason });
    }

    // Check rate limit
    const rateLimitStart = Date.now();
    const rateLimitCheck = await checkRateLimit(ip, isSuspicious);
    logger.perf("Rate limit check", Date.now() - rateLimitStart);

    if (!rateLimitCheck.allowed) {
      logger.warn("Rate limit exceeded", {
        ip,
        isSuspicious,
        remaining: rateLimitCheck.remaining,
      });

      const errorMessage = isSuspicious
        ? "Access restricted. Suspicious activity or VPN detected. Please try from a residential connection."
        : "Rate limit exceeded. Free tier allows 10 extractions per day.";

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCode: ErrorCode.RATE_LIMIT_EXCEEDED,
        },
        { status: StatusCode.RATE_LIMITED }
      );
    }

    let content = "";
    let sourceType = SourceType.TEXT;
    let sourceUrl = "";

    // Content Sanitization for Text input
    if (text) {
      const contentCheck = validateInputContent(text);
      if (!contentCheck.isSafe) {
        logger.warn("Unsafe text content blocked", {
          reason: contentCheck.reason,
        });
        return NextResponse.json(
          {
            success: false,
            error: contentCheck.reason || "Invalid content detected",
            errorCode: ErrorCode.INVALID_INPUT,
          },
          { status: StatusCode.BAD_REQUEST }
        );
      }
    }

    // Handle URL input
    if (url) {
      logger.info("Processing URL input", { url: url.substring(0, 100) });

      // Validate URL
      const urlValidationStart = Date.now();
      const urlValidation = validateUrl(url);
      logger.perf("URL validation", Date.now() - urlValidationStart);

      if (!urlValidation.isValid) {
        logger.warn("URL validation failed", { error: urlValidation.error });
        return NextResponse.json(
          {
            success: false,
            error: urlValidation.error || "Invalid URL",
            errorCode: ErrorCode.INVALID_URL,
          },
          { status: StatusCode.BAD_REQUEST }
        );
      }

      sourceType = urlValidation.sourceType!;
      sourceUrl = url;
      logger.info("URL validated", {
        sourceType,
        videoId: urlValidation.videoId,
      });

      // Early URL pre-detection (soft check)
      const likelyRecipe = isLikelyRecipeUrl(url);
      if (!likelyRecipe && sourceType === SourceType.BLOG) {
        logger.info(
          "URL path does not strongly suggest a recipe, will perform deeper signal check after scraping"
        );
      }

      // Check cache
      const cacheCheckStart = Date.now();
      const cachedRecipe = await getCachedRecipe(url);
      logger.perf("Cache check", Date.now() - cacheCheckStart);

      if (cachedRecipe) {
        logger.info("✓ Cache HIT - returning cached recipe");
        logger.cost("Recipe served from cache", {
          cacheHit: true,
          modelUsed: "cached",
          tokensUsed: 0,
          estimatedCost: 0,
        });
        return NextResponse.json({
          success: true,
          recipe: cachedRecipe,
          metadata: {
            cacheHit: true,
            modelUsed: "cached",
            processingTime: Date.now() - overallStart,
          },
        });
      }

      logger.info("Cache MISS - proceeding with extraction");

      // Extract content based on source type
      if (sourceType === SourceType.YOUTUBE) {
        const videoId = urlValidation.videoId!;
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
          return NextResponse.json(
            {
              success: false,
              error: result.error || "Failed to extract YouTube content",
              errorCode: ErrorCode.EXTRACTION_FAILED,
            },
            { status: StatusCode.INTERNAL_SERVER_ERROR }
          );
        }

        // Check if YouTube description contains an external recipe link
        if (result.externalRecipeUrl) {
          logger.info("YouTube description contains external recipe URL, following it", {
            videoId,
            externalUrl: result.externalRecipeUrl,
            descriptionLength: result.content?.length || 0,
          });

          // Import web scraper
          const { extractStructuredRecipe } = await import("@/lib/extractors/webScraper");

          const webStart = Date.now();
          const webResult = await extractStructuredRecipe(result.externalRecipeUrl);
          logger.perf("External recipe URL extraction", Date.now() - webStart);

          if (webResult.success && webResult.recipe) {
            const validation = validateRecipe(webResult.recipe);
            const hasEnoughIngredients = webResult.recipe.ingredients.length >= 3;
            const hasEnoughInstructions = webResult.recipe.instructions.length >= 3;

            if (validation.isValid && hasEnoughIngredients && hasEnoughInstructions) {
              logger.info("🚀 Successfully extracted recipe from external URL (structured data bypass)");
              const recipe = webResult.recipe;

              recipe.confidenceScore = calculateConfidenceScore(recipe);
              recipe.sourcePlatform = SourceType.YOUTUBE; // Keep original source as YouTube
              recipe.sourceUrl = url; // Original YouTube URL

              await setCachedRecipe(url, recipe);
              await saveRecipeToLongTermStorage(
                recipe,
                {
                  ipAddress: ip,
                  userAgent: request.headers.get("user-agent") || undefined,
                  country: request.headers.get("x-vercel-ip-country") || undefined,
                  region: request.headers.get("x-vercel-ip-country-region") || undefined,
                  isSuspicious,
                },
                url
              );
              await incrementRateLimit(ip);

              return NextResponse.json({
                success: true,
                recipe,
                metadata: {
                  cacheHit: false,
                  modelUsed: "structured-data-bypass",
                  processingTime: Date.now() - overallStart,
                  externalRecipeUrl: result.externalRecipeUrl,
                },
              });
            }
          }

          // If structured extraction succeeded but didn't have good data, use it as content
          if (webResult.success && webResult.content) {
            logger.info("Using external recipe URL content for LLM extraction");
            content = webResult.content;
            sourceType = SourceType.BLOG; // Change source type for better prompting
          } else {
            // External URL failed, fall back to YouTube description
            logger.warn("External recipe URL extraction failed, using YouTube description", {
              error: webResult.error,
            });
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
          return NextResponse.json(
            {
              success: false,
              error: "Extracted content contains restricted patterns.",
              errorCode: ErrorCode.EXTRACTION_FAILED,
            },
            { status: StatusCode.BAD_REQUEST }
          );
        }

        logger.info("YouTube content extracted", {
          contentLength: content.length,
          source: result.metadata?.videoId ? "transcript" : "description",
          hadExternalUrl: !!result.externalRecipeUrl,
        });
      } else {
        logger.info("Extracting web content");
        const scrapeStart = Date.now();

        // Try structured data first (faster)
        logger.debug("Attempting structured data extraction");
        const { extractStructuredRecipe } =
          await import("@/lib/extractors/webScraper");
        const result = await extractStructuredRecipe(url);

        logger.perf("Web extraction", Date.now() - scrapeStart);

        // Only bypass LLM if structured data is Exceptionally high quality
        if (result.success && result.recipe) {
          const validation = validateRecipe(result.recipe);
          // Check for more than just basic validity - ensure we have enough content to warrant a bypass
          const hasEnoughIngredients = result.recipe.ingredients.length >= 3;
          const hasEnoughInstructions = result.recipe.instructions.length >= 3;

          if (
            validation.isValid &&
            hasEnoughIngredients &&
            hasEnoughInstructions
          ) {
            logger.info("🚀 LLM BYPASS - Using high-quality structured data");
            const recipe = result.recipe;

            // Calculate confidence score and set source platform
            recipe.confidenceScore = calculateConfidenceScore(recipe);
            recipe.sourcePlatform = sourceType;
            recipe.sourceUrl = url;

            await setCachedRecipe(url, recipe);
            await saveRecipeToLongTermStorage(
              recipe,
              {
                ipAddress: ip,
                userAgent: request.headers.get("user-agent") || undefined,
                country:
                  request.headers.get("x-vercel-ip-country") || undefined,
                region:
                  request.headers.get("x-vercel-ip-country-region") ||
                  undefined,
                isSuspicious,
              },
              url
            );
            await incrementRateLimit(ip);

            return NextResponse.json({
              success: true,
              recipe,
              metadata: {
                cacheHit: false,
                modelUsed: "structured-data-bypass",
                processingTime: Date.now() - overallStart,
              },
            });
          }
          logger.info(
            "Structured data incomplete or sparse, proceeding to LLM for better quality"
          );
        }

        if (!result.success) {
          logger.error("Web scraping failed", result.error);
          return NextResponse.json(
            {
              success: false,
              error: result.error || "Failed to scrape web content",
              errorCode: ErrorCode.EXTRACTION_FAILED,
            },
            { status: StatusCode.INTERNAL_SERVER_ERROR }
          );
        }
        content = result.content!;

        // Sanitize extracted content
        const contentCheck = validateInputContent(content);
        if (!contentCheck.isSafe) {
          logger.warn("Unsafe extracted content blocked", {
            reason: contentCheck.reason,
            url,
          });
          return NextResponse.json(
            {
              success: false,
              error: "Extracted content contains restricted patterns.",
              errorCode: ErrorCode.EXTRACTION_FAILED,
            },
            { status: StatusCode.BAD_REQUEST }
          );
        }

        logger.info("Web content extracted", {
          contentLength: content.length,
          title: result.metadata?.title?.substring(0, 50),
          hasRecipeSignals: result.metadata?.hasRecipeSignals,
        });

        // Hard pre-detection check after scraping for non-social/non-youtube sources
        if (
          sourceType === SourceType.BLOG &&
          !result.metadata?.hasRecipeSignals &&
          !isLikelyRecipeUrl(url)
        ) {
          logger.warn(
            "No recipe signals found in URL or page content. Rejecting before LLM call."
          );
          return NextResponse.json(
            {
              success: false,
              error:
                "This URL doesn't appear to contain a recipe. Please try a different URL or paste the recipe text directly.",
              errorCode: ErrorCode.NO_RECIPE_FOUND,
            },
            { status: StatusCode.BAD_REQUEST }
          );
        }
      }
    } else {
      content = text;
      sourceType = SourceType.TEXT;
      logger.info("Processing text input", { contentLength: content.length });
    }

    // Get request count for model selection
    const requestCount = await getRequestCount(ip);

    // Select model
    const modelSelectStart = Date.now();
    let model = selectModel({
      contentLength: content.length,
      sourceType,
      requestCount,
    });
    logger.perf("Model selection", Date.now() - modelSelectStart);
    logger.info("Model selected", {
      model,
      contentLength: content.length,
      requestCount,
    });

    // Build prompt
    const promptStart = Date.now();
    const prompt = buildRecipeExtractionPrompt(content, sourceType);
    logger.perf("Prompt building", Date.now() - promptStart);
    logger.debug("Prompt built", {
      promptLength: prompt.length,
      contentLength: content.length,
      estimatedInputTokens: Math.ceil(prompt.length / 4),
    });

    // Log content preview for debugging
    logger.debug("Content preview being sent to LLM", {
      contentPreview: content.substring(0, 500),
      contentLength: content.length,
      sourceType,
    });

    // Call LLM (Gemini only)
    logger.info(`⏳ Calling Gemini API...`, { model });
    const llmStart = Date.now();
    let llmResponse;
    try {
      llmResponse = await extractRecipeWithGemini(content, prompt, model);
      const llmDuration = Date.now() - llmStart;
      logger.perf(`🚀 Gemini API call`, llmDuration);
      logger.info("LLM response received", {
        tokensUsed: llmResponse.tokensUsed,
        responseLength: llmResponse.content.length,
        duration: llmDuration,
      });

      // Track LLM cost metrics
      logger.cost("LLM extraction completed", {
        tokensUsed: llmResponse.tokensUsed,
        modelUsed: model,
        cacheHit: false,
      });
    } catch (error) {
      const llmDuration = Date.now() - llmStart;
      logger.error("❌ Gemini API call failed", {
        error,
        duration: llmDuration,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to process recipe with AI",
          errorCode: ErrorCode.INTERNAL_ERROR,
        },
        { status: StatusCode.INTERNAL_SERVER_ERROR }
      );
    }

    // Parse response
    const parseStart = Date.now();
    const parseResult = parseRecipeFromLLMResponse(llmResponse.content);
    logger.perf("Response parsing", Date.now() - parseStart);

    // Handle case where LLM explicitly found no recipe
    if (parseResult.noRecipeFound) {
      logger.info("LLM explicitly indicated no recipe found", {
        reason: parseResult.noRecipeReason,
      });
      return NextResponse.json(
        {
          success: false,
          error: parseResult.noRecipeReason || "No recipe found in the content",
          errorCode: ErrorCode.NO_RECIPE_FOUND,
        },
        { status: StatusCode.BAD_REQUEST }
      );
    }

    if (!parseResult.success) {
      logger.error("Failed to parse LLM response", {
        error: parseResult.error,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse recipe from AI response",
          errorCode: ErrorCode.VALIDATION_FAILED,
        },
        { status: StatusCode.INTERNAL_SERVER_ERROR }
      );
    }

    let recipe = parseResult.recipe!;
    logger.info("Recipe parsed successfully", {
      title: recipe.title,
      ingredientsCount: recipe.ingredients.length,
      instructionsCount: recipe.instructions.length,
    });

    // Validate recipe
    const validationStart = Date.now();
    let validation = validateRecipe(recipe);
    logger.perf("Recipe validation", Date.now() - validationStart);

    // Fallback System
    if (!validation.isValid) {
      logger.warn("Recipe validation failed, entering fallback mode", {
        errors: validation.errors,
        model,
      });

      const missingFields = [];
      if (validation.missingTitle) missingFields.push("title");
      if (validation.missingIngredients) missingFields.push("ingredients");
      if (validation.missingInstructions) missingFields.push("instructions");

      const fallbackPrompt = buildFallbackPrompt(
        recipe,
        content.substring(0, 1000), // Provide some context
        missingFields
      );

      logger.info("⏳ Calling fallback Gemini generation...");
      try {
        const fallbackResponse = await extractRecipeWithGemini(
          content,
          fallbackPrompt,
          model
        );

        const fallbackParseResult = parseRecipeFromLLMResponse(
          fallbackResponse.content
        );
        if (fallbackParseResult.success) {
          recipe = fallbackParseResult.recipe!;
          recipe.isPartialFallback = true;
          recipe.fallbackFields = missingFields;
          logger.info("✓ Fallback recipe generated successfully");
        } else {
          throw new Error("Fallback parsing failed");
        }
      } catch (fallbackError) {
        logger.error("❌ Fallback generation failed", fallbackError);
        return NextResponse.json(
          {
            success: false,
            error: "Could not extract or generate a valid recipe",
            errorCode: ErrorCode.NO_RECIPE_FOUND,
          },
          { status: StatusCode.BAD_REQUEST }
        );
      }
    }

    logger.info("✓ Recipe validation passed");

    // Calculate confidence score
    recipe.confidenceScore = calculateConfidenceScore(recipe);
    recipe.sourcePlatform = sourceType;
    logger.info("Confidence score calculated", {
      score: recipe.confidenceScore,
      sourcePlatform: sourceType,
    });

    // Ensure sourceUrl is always attached to the recipe object
    if (sourceUrl) {
      recipe.sourceUrl = sourceUrl;
    }

    // Cache the result if from URL
    if (sourceUrl) {
      const cacheStart = Date.now();
      await setCachedRecipe(sourceUrl, recipe);
      logger.perf("Cache storage", Date.now() - cacheStart);
      logger.debug("Recipe cached", { url: sourceUrl.substring(0, 100) });
    }

    // Always save to long-term storage for data collection
    // Note: for text input, sourceUrl will be empty string, which is correct
    await saveRecipeToLongTermStorage(
      recipe,
      {
        ipAddress: ip,
        userAgent: request.headers.get("user-agent") || undefined,
        country: request.headers.get("x-vercel-ip-country") || undefined,
        region: request.headers.get("x-vercel-ip-country-region") || undefined,
        isSuspicious,
      },
      sourceUrl || undefined
    );

    // Increment rate limit
    await incrementRateLimit(ip);

    const totalDuration = Date.now() - overallStart;
    logger.info("=== Extraction complete ===", {
      success: true,
      totalDuration,
      model,
    });
    logger.perf("TOTAL extraction time", totalDuration);

    // Return success
    return NextResponse.json({
      success: true,
      recipe,
      metadata: {
        cacheHit: false,
        modelUsed: model,
        tokensUsed: llmResponse.tokensUsed,
        processingTime: totalDuration,
        isFallback: recipe.isGenerated || recipe.isPartialFallback,
      },
    });
  } catch (error) {
    const totalDuration = Date.now() - overallStart;
    logger.error("❌ Extraction failed with exception", {
      error,
      duration: totalDuration,
    });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        errorCode: ErrorCode.INTERNAL_ERROR,
      },
      { status: StatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
