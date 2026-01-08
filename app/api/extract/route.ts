import { NextRequest, NextResponse } from 'next/server';
import { validateUrl } from '@/lib/validators/urlValidator';
import { validateRecipe } from '@/lib/validators/recipeValidator';
import { extractYoutubeTranscript } from '@/lib/extractors/youtubeExtractor';
import { scrapeWebContent } from '@/lib/extractors/webScraper';
import { extractRecipeWithAnthropic } from '@/lib/llm/anthropicClient';
import { parseRecipeFromLLMResponse } from '@/lib/llm/responseParser';
import { buildRecipeExtractionPrompt } from '@/lib/llm/promptBuilder';
import { selectModel, shouldRetryWithBetterModel, CLAUDE_HAIKU } from '@/lib/llm/modelSelector';
import { getCachedRecipe, setCachedRecipe } from '@/lib/cache/cacheClient';
import { checkRateLimit, incrementRateLimit } from '@/lib/utils/rateLimiter';
import { ErrorCode, StatusCode } from '@/types/api';
import { SourceType } from '@/types/recipe';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request body
    const body = await request.json();
    const { url, text } = body;

    // Validate input
    if (!url && !text) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either URL or text content is required',
          errorCode: ErrorCode.INVALID_INPUT,
        },
        { status: StatusCode.BAD_REQUEST }
      );
    }

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Check rate limit
    const rateLimitCheck = await checkRateLimit(ip);
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Free tier allows 10 extractions per day.',
          errorCode: ErrorCode.RATE_LIMIT_EXCEEDED,
        },
        { status: StatusCode.RATE_LIMITED }
      );
    }

    let content = '';
    let sourceType = SourceType.TEXT;
    let sourceUrl = '';

    // Handle URL input
    if (url) {
      // Validate URL
      const urlValidation = validateUrl(url);
      if (!urlValidation.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: urlValidation.error || 'Invalid URL',
            errorCode: ErrorCode.INVALID_URL,
          },
          { status: StatusCode.BAD_REQUEST }
        );
      }

      sourceType = urlValidation.sourceType!;
      sourceUrl = url;

      // Check cache
      const cachedRecipe = await getCachedRecipe(url);
      if (cachedRecipe) {
        return NextResponse.json({
          success: true,
          recipe: cachedRecipe,
          metadata: {
            cacheHit: true,
            modelUsed: 'cached',
            processingTime: Date.now() - startTime,
          },
        });
      }

      // Extract content based on source type
      if (sourceType === SourceType.YOUTUBE) {
        const result = await extractYoutubeTranscript(urlValidation.videoId!);
        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error || 'Failed to extract YouTube transcript',
              errorCode: ErrorCode.EXTRACTION_FAILED,
            },
            { status: StatusCode.INTERNAL_SERVER_ERROR }
          );
        }
        content = result.content!;
      } else {
        const result = await scrapeWebContent(url);
        if (!result.success) {
          return NextResponse.json(
            {
              success: false,
              error: result.error || 'Failed to scrape web content',
              errorCode: ErrorCode.EXTRACTION_FAILED,
            },
            { status: StatusCode.INTERNAL_SERVER_ERROR }
          );
        }
        content = result.content!;
      }
    } else {
      content = text;
      sourceType = SourceType.TEXT;
    }

    // Select model
    let model = selectModel({
      contentLength: content.length,
      sourceType,
    });

    // Build prompt
    const prompt = buildRecipeExtractionPrompt(content, sourceType);

    // Call LLM
    let llmResponse;
    try {
      llmResponse = await extractRecipeWithAnthropic(content, model);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to process recipe with AI',
          errorCode: ErrorCode.INTERNAL_ERROR,
        },
        { status: StatusCode.INTERNAL_SERVER_ERROR }
      );
    }

    // Parse response
    const parseResult = parseRecipeFromLLMResponse(llmResponse.content);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse recipe from AI response',
          errorCode: ErrorCode.VALIDATION_FAILED,
        },
        { status: StatusCode.INTERNAL_SERVER_ERROR }
      );
    }

    const recipe = parseResult.recipe!;

    // Validate recipe
    const validation = validateRecipe(recipe);
    if (!validation.isValid) {
      // Retry with better model if using Haiku
      if (shouldRetryWithBetterModel(model, true)) {
        model = selectModel({
          contentLength: content.length,
          sourceType,
          isRetry: true,
          previousModel: CLAUDE_HAIKU,
        });

        const retryResponse = await extractRecipeWithAnthropic(content, model);
        const retryParseResult = parseRecipeFromLLMResponse(retryResponse.content);

        if (retryParseResult.success) {
          const retryValidation = validateRecipe(retryParseResult.recipe!);
          if (retryValidation.isValid) {
            // Success with retry
            if (sourceUrl) {
              await setCachedRecipe(sourceUrl, retryParseResult.recipe!);
            }
            await incrementRateLimit(ip);

            return NextResponse.json({
              success: true,
              recipe: retryParseResult.recipe!,
              metadata: {
                cacheHit: false,
                modelUsed: model,
                tokensUsed: retryResponse.tokensUsed,
                processingTime: Date.now() - startTime,
              },
            });
          }
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Could not extract a valid recipe from the content',
          errorCode: ErrorCode.NO_RECIPE_FOUND,
        },
        { status: StatusCode.BAD_REQUEST }
      );
    }

    // Cache the result if from URL
    if (sourceUrl) {
      await setCachedRecipe(sourceUrl, recipe);
    }

    // Increment rate limit
    await incrementRateLimit(ip);

    // Return success
    return NextResponse.json({
      success: true,
      recipe,
      metadata: {
        cacheHit: false,
        modelUsed: model,
        tokensUsed: llmResponse.tokensUsed,
        processingTime: Date.now() - startTime,
      },
    });
  } catch (error) {
    console.error('Extraction API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        errorCode: ErrorCode.INTERNAL_ERROR,
      },
      { status: StatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
