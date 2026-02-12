import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
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
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType, Recipe } from "@/types/recipe";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:ProcessLLM");

/**
 * Processes extracted content through LLM, validates, caches, and returns the recipe.
 */
export async function processContentWithLLM(
  content: string,
  sourceType: SourceType,
  ip: string,
  sourceUrl: string,
  overallStart: number,
  request: NextRequest,
  isSuspicious: boolean
): Promise<NextResponse> {
  // Get request count for model selection
  const requestCount = await getRequestCount(ip);

  // Select model
  const model = selectModel({
    contentLength: content.length,
    sourceType,
    requestCount,
  });
  logger.info("Model selected", {
    model,
    contentLength: content.length,
    requestCount,
  });

  // Build prompt
  const prompt = buildRecipeExtractionPrompt(content, sourceType);
  logger.debug("Prompt built", {
    promptLength: prompt.length,
    estimatedInputTokens: Math.ceil(prompt.length / 4),
  });

  // Call LLM
  logger.info("Calling Gemini API...", { model });
  const llmStart = Date.now();
  let llmResponse;
  try {
    llmResponse = await extractRecipeWithGemini(content, prompt, model);
    const llmDuration = Date.now() - llmStart;
    logger.perf("Gemini API call", llmDuration);
    logger.info("LLM response received", {
      tokensUsed: llmResponse.tokensUsed,
      responseLength: llmResponse.content.length,
      duration: llmDuration,
    });

    logger.cost("LLM extraction completed", {
      tokensUsed: llmResponse.tokensUsed,
      modelUsed: model,
      cacheHit: false,
    });
  } catch (error) {
    logger.error("Gemini API call failed", {
      error,
      duration: Date.now() - llmStart,
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
  const parseResult = parseRecipeFromLLMResponse(llmResponse.content);

  // Handle no recipe found
  if (parseResult.noRecipeFound) {
    logger.info("LLM explicitly indicated no recipe found", {
      reason: parseResult.noRecipeReason,
    });
    return NextResponse.json(
      {
        success: false,
        error:
          parseResult.noRecipeReason || "No recipe found in the content",
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
  const validation = validateRecipe(recipe);

  // Fallback system
  if (!validation.isValid) {
    const fallbackResult = await attemptFallback(
      recipe,
      content,
      model,
      validation
    );
    if (fallbackResult instanceof NextResponse) return fallbackResult;
    recipe = fallbackResult;
  }

  logger.info("Recipe validation passed");

  // Calculate confidence score
  recipe.confidenceScore = calculateConfidenceScore(recipe);
  recipe.sourcePlatform = sourceType;
  if (sourceUrl) {
    recipe.sourceUrl = sourceUrl;
  }

  // Cache the result if from URL
  if (sourceUrl) {
    await setCachedRecipe(sourceUrl, recipe);
    logger.debug("Recipe cached", { url: sourceUrl.substring(0, 100) });
  }

  // Save to long-term storage
  await saveRecipeToLongTermStorage(
    recipe,
    {
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      country: request.headers.get("x-vercel-ip-country") || undefined,
      region:
        request.headers.get("x-vercel-ip-country-region") || undefined,
      isSuspicious,
    },
    sourceUrl || undefined
  );

  // Increment rate limit
  await incrementRateLimit(ip);

  const totalDuration = Date.now() - overallStart;
  logger.info("Extraction complete", {
    success: true,
    totalDuration,
    model,
  });
  logger.perf("TOTAL extraction time", totalDuration);

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
}

/**
 * Attempts a fallback LLM call when initial validation fails.
 */
async function attemptFallback(
  recipe: Recipe,
  content: string,
  model: string,
  validation: ReturnType<typeof validateRecipe>
): Promise<Recipe | NextResponse> {
  logger.warn("Recipe validation failed, entering fallback mode", {
    errors: validation.errors,
    model,
  });

  const missingFields: string[] = [];
  if (validation.missingTitle) missingFields.push("title");
  if (validation.missingIngredients) missingFields.push("ingredients");
  if (validation.missingInstructions) missingFields.push("instructions");

  const fallbackPrompt = buildFallbackPrompt(
    recipe,
    content.substring(0, 1000),
    missingFields
  );

  logger.info("Calling fallback Gemini generation...");
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
      const fallbackRecipe = fallbackParseResult.recipe!;
      fallbackRecipe.isPartialFallback = true;
      fallbackRecipe.fallbackFields = missingFields;
      logger.info("Fallback recipe generated successfully");
      return fallbackRecipe;
    } else {
      throw new Error("Fallback parsing failed");
    }
  } catch (fallbackError) {
    logger.error("Fallback generation failed", fallbackError);
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
