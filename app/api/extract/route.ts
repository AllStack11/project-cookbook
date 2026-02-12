import { NextRequest, NextResponse } from "next/server";
import {
  validateAndAuthorizeRequest,
  ValidatedRequest,
} from "@/lib/api/requestValidation";
import { extractContentFromUrl } from "@/lib/api/extractContent";
import { processContentWithLLM } from "@/lib/api/processWithLLM";
import { ErrorCode, StatusCode } from "@/types/api";
import { SourceType } from "@/types/recipe";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:Extract");

export async function POST(request: NextRequest) {
  const overallStart = Date.now();
  logger.info("=== Starting recipe extraction ===");

  try {
    // Step 1: Validate and authorize the request
    const validationResult = await validateAndAuthorizeRequest(request);

    // If it's a NextResponse, it means validation failed - return the error
    if (validationResult instanceof NextResponse) {
      return validationResult;
    }

    const { url, text, ip, isSuspicious } =
      validationResult as ValidatedRequest;

    let content = "";
    let sourceType = SourceType.TEXT;
    let sourceUrl = "";

    // Step 2: Extract content
    if (url) {
      const extractionResult = await extractContentFromUrl(
        url,
        ip,
        isSuspicious,
        overallStart,
        request
      );

      // Early return (cache hit or structured data bypass)
      if ("response" in extractionResult) {
        return extractionResult.response;
      }

      content = extractionResult.content;
      sourceType = extractionResult.sourceType;
      sourceUrl = extractionResult.sourceUrl;
    } else {
      content = text!;
      sourceType = SourceType.TEXT;
      logger.info("Processing text input", { contentLength: content.length });
    }

    // Step 3: Process with LLM
    return await processContentWithLLM(
      content,
      sourceType,
      ip,
      sourceUrl,
      overallStart,
      request,
      isSuspicious
    );
  } catch (error) {
    const totalDuration = Date.now() - overallStart;
    logger.error("Extraction failed with exception", {
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
