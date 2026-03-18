import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import {
  validateRecipe,
  calculateConfidenceScore,
} from "@/lib/validators/recipeValidator";
import { extractRecipe } from "@/lib/llm/provider";
import type { LLMExtractionResponse } from "@/lib/llm/provider";
import { parseRecipeFromLLMResponse } from "@/lib/llm/responseParser";
import {
  buildRecipeExtractionPrompt,
  buildFallbackPrompt,
} from "@/lib/llm/promptBuilder";
import { selectModelCandidates } from "@/lib/llm/modelSelector";
import type { ModelAttemptType } from "@/lib/llm/modelSelector";
import { setCachedRecipe } from "@/lib/cache/cacheClient";
import { saveRecipeToLongTermStorage } from "@/lib/db";
import { incrementRateLimit, getRequestCount } from "@/lib/utils/rateLimiter";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType, Recipe } from "@/types/recipe";
import { createLogger } from "@/lib/utils/logger";
import {
  canAffordEstimatedCall,
  recordActualSpend,
} from "@/lib/llm/budgetGuard";
import { LLMProviderError, classifyLLMError } from "@/lib/llm/errors";

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
  isSuspicious: boolean,
): Promise<NextResponse> {
  const requestCount = await getRequestCount(ip);

  const attempts = selectModelCandidates({
    contentLength: content.length,
    sourceType,
    requestCount,
  });
  logger.info("Model candidates selected", {
    attempts,
    contentLength: content.length,
    requestCount,
  });

  const prompt = buildRecipeExtractionPrompt(content, sourceType);
  logger.debug("Prompt built", {
    promptLength: prompt.length,
    estimatedInputTokens: Math.ceil(prompt.length / 4),
  });

  const llmStart = Date.now();
  let llmResponse: LLMExtractionResponse | undefined;
  let modelUsed = "";
  let providerUsed = "";
  let modelTierUsed: ModelAttemptType = "primary";
  let freeAttemptFailedReason: string | undefined;
  let allowFallback = false;
  const modelErrors: Array<{
    attemptType: ModelAttemptType;
    model: string;
    reason: string;
    errorCode?: string;
    errorClass?: string;
    statusCode?: number;
    escalatedToPaid: boolean;
  }> = [];

  try {
    for (const attempt of attempts) {
      const { model, attemptType } = attempt;

      if (attemptType === "fallback" && !allowFallback) {
        logger.info(
          "Skipping fallback; primary attempt did not fail with provider/runtime error",
          {
            attemptType,
            model,
          },
        );
        modelErrors.push({
          attemptType,
          model,
          reason: "fallback_not_permitted",
          escalatedToPaid: false,
        });
        continue;
      }

      const budget = await canAffordEstimatedCall(model, prompt.length);
      if (!budget.allowed) {
        logger.warn("Skipping model due to monthly budget cap", {
          model,
          attemptType,
          currentSpendUsd: budget.currentSpendUsd,
          estimatedCallCostUsd: budget.estimatedCallCostUsd,
          capUsd: budget.capUsd,
        });
        modelErrors.push({
          attemptType,
          model,
          reason: "budget_cap_reached",
          escalatedToPaid: false,
        });
        continue;
      }

      logger.info("Calling LLM model...", { model, attemptType });
      try {
        llmResponse = await extractRecipe(content, prompt, model, {
          attemptType,
          providerRouting: attempt.providerRouting,
        });
        modelUsed = llmResponse.model || model;
        providerUsed = llmResponse.provider;
        modelTierUsed = attemptType;
        break;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        const errorCode =
          error instanceof LLMProviderError ? error.code : undefined;
        const statusCode =
          error instanceof LLMProviderError ? error.statusCode : undefined;
        const errorClass = classifyLLMError(error);
        const escalatedToFallback =
          attemptType !== "fallback" && errorClass === "provider_runtime";

        if (escalatedToFallback) {
          allowFallback = true;
          freeAttemptFailedReason = errorCode || "provider_runtime";
        }

        modelErrors.push({
          attemptType,
          model,
          reason,
          errorCode,
          errorClass,
          statusCode,
          escalatedToPaid: !!escalatedToFallback,
        });
        logger.warn("Model attempt failed, trying next candidate", {
          model,
          attemptType,
          reason,
          errorCode,
          errorClass,
          statusCode,
          escalatedToFallback,
        });
      }
    }

    if (!llmResponse) {
      throw new Error("No model candidates succeeded");
    }

    const llmDuration = Date.now() - llmStart;
    logger.perf("LLM provider call", llmDuration);
    logger.info("LLM response received", {
      tokensUsed: llmResponse.tokensUsed,
      responseLength: llmResponse.content.length,
      duration: llmDuration,
      modelUsed,
      providerUsed,
      modelTierUsed,
      freeAttemptFailedReason,
    });

    await recordActualSpend(modelUsed, prompt.length, llmResponse.tokensUsed);

    logger.cost("LLM extraction completed", {
      tokensUsed: llmResponse.tokensUsed,
      modelUsed,
      cacheHit: false,
    });
  } catch (error) {
    logger.error("All LLM model attempts failed", {
      error,
      duration: Date.now() - llmStart,
      attempts: modelErrors,
    });
    return NextResponse.json(
      {
        success: false,
        error:
          "AI extraction is temporarily unavailable right now. Please try again shortly.",
        errorCode: ErrorCode.INTERNAL_ERROR,
      },
      { status: StatusCode.SERVICE_UNAVAILABLE },
    );
  }

  let parseResult = parseRecipeFromLLMResponse(llmResponse.content);

  if (
    !parseResult.success &&
    (parseResult.validationError || parseResult.parseError) &&
    !parseResult.noRecipeFound
  ) {
    logger.warn(
      "Initial LLM response failed parse/validation, attempting self-correction...",
      {
        validationError: parseResult.validationError,
        parseError: parseResult.parseError,
        error: parseResult.error,
      },
    );

    const correctionReason =
      parseResult.validationError || parseResult.error || "Invalid JSON";
    const correctionPrompt = `The previous JSON response was invalid according to the expected format.
Errors:
${correctionReason}

Please fix the JSON and return only the valid JSON object.
Previous Response:
${llmResponse.content}`;

    try {
      const correctionLLMResponse = await extractRecipe(
        content,
        correctionPrompt,
        modelUsed,
      );
      const correctedParseResult = parseRecipeFromLLMResponse(
        correctionLLMResponse.content,
      );

      if (correctedParseResult.success) {
        logger.info("Self-correction successful!");
        parseResult = correctedParseResult;
        llmResponse.tokensUsed += correctionLLMResponse.tokensUsed;
      } else {
        logger.warn("Self-correction attempt also failed validation", {
          error: correctedParseResult.validationError,
        });
      }
    } catch (correctionError) {
      logger.error("Self-correction call failed", { error: correctionError });
    }
  }

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
      { status: StatusCode.BAD_REQUEST },
    );
  }

  if (!parseResult.success) {
    logger.error("Failed to parse LLM response after all attempts", {
      error: parseResult.error,
      validationError: parseResult.validationError,
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to parse recipe from AI response",
        errorCode: ErrorCode.VALIDATION_FAILED,
        details: parseResult.validationError,
      },
      { status: StatusCode.INTERNAL_SERVER_ERROR },
    );
  }

  let recipe = parseResult.recipe!;
  logger.info("Recipe parsed successfully", {
    title: recipe.title,
    ingredientsCount: recipe.ingredients.length,
    instructionsCount: recipe.instructions.length,
  });

  const validation = validateRecipe(recipe);

  if (!validation.isValid) {
    const fallbackResult = await attemptFallback(
      recipe,
      content,
      modelUsed,
      validation,
    );
    if (fallbackResult instanceof NextResponse) return fallbackResult;
    recipe = fallbackResult;
  }

  logger.info("Recipe validation passed");

  recipe.confidenceScore = calculateConfidenceScore(recipe);
  recipe.sourcePlatform = sourceType;
  if (sourceUrl) {
    recipe.sourceUrl = sourceUrl;
  }

  if (sourceUrl) {
    await setCachedRecipe(sourceUrl, recipe);
    logger.debug("Recipe cached", { url: sourceUrl.substring(0, 100) });
  }

  await saveRecipeToLongTermStorage(
    recipe,
    {
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      country: request.headers.get("x-vercel-ip-country") || undefined,
      region: request.headers.get("x-vercel-ip-country-region") || undefined,
      isSuspicious,
    },
    sourceUrl || undefined,
  );

  await incrementRateLimit(ip);

  const totalDuration = Date.now() - overallStart;
  logger.info("Extraction complete", {
    success: true,
    totalDuration,
    model: modelUsed,
    provider: providerUsed,
  });
  logger.perf("TOTAL extraction time", totalDuration);

  return NextResponse.json({
    success: true,
    recipe,
    metadata: {
      cacheHit: false,
      modelUsed,
      providerUsed,
      tokensUsed: llmResponse.tokensUsed,
      processingTime: totalDuration,
      isFallback: recipe.isGenerated || recipe.isPartialFallback,
      fallbackTierUsed:
        modelTierUsed === "fallback" ? "fallback" : "primary_only",
      freeAttemptFailedReason,
    },
  });
}

async function attemptFallback(
  recipe: Recipe,
  content: string,
  model: string,
  validation: ReturnType<typeof validateRecipe>,
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
    missingFields,
  );

  logger.info("Calling fallback LLM generation...");
  try {
    const fallbackResponse = await extractRecipe(
      content,
      fallbackPrompt,
      model,
    );

    const fallbackParseResult = parseRecipeFromLLMResponse(
      fallbackResponse.content,
    );
    if (fallbackParseResult.success) {
      const fallbackRecipe = fallbackParseResult.recipe!;
      fallbackRecipe.isPartialFallback = true;
      fallbackRecipe.fallbackFields = missingFields;
      logger.info("Fallback recipe generated successfully");
      return fallbackRecipe;
    }
    throw new Error("Fallback parsing failed");
  } catch (fallbackError) {
    logger.error("Fallback generation failed", fallbackError);
    return NextResponse.json(
      {
        success: false,
        error: "Could not extract or generate a valid recipe",
        errorCode: ErrorCode.NO_RECIPE_FOUND,
      },
      { status: StatusCode.BAD_REQUEST },
    );
  }
}
