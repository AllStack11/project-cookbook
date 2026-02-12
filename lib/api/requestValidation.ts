import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/utils/rateLimiter";
import { isSuspiciousIP } from "@/lib/utils/vpnDetector";
import { validateInputContent } from "@/lib/validators/contentValidator";
import { ErrorCode, StatusCode } from "@/types/api";
import { createLogger } from "@/lib/utils/logger";

const logger = createLogger("API:RequestValidation");

export interface ValidatedRequest {
  url?: string;
  text?: string;
  ip: string;
  isSuspicious: boolean;
}

function extractClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Validates the incoming request: parses body, checks rate limits, detects VPNs.
 * Returns either a ValidatedRequest or a NextResponse (error).
 */
export async function validateAndAuthorizeRequest(
  request: NextRequest
): Promise<ValidatedRequest | NextResponse> {
  // Early input size validation
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 100_000) {
    logger.warn("Request body too large", { contentLength });
    return NextResponse.json(
      {
        success: false,
        error: "Request body too large. Maximum size is 100KB.",
        errorCode: ErrorCode.INVALID_INPUT,
      },
      { status: StatusCode.BAD_REQUEST }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logger.warn("Invalid JSON body received");
    return NextResponse.json(
      {
        success: false,
        error: "Invalid JSON request body",
        errorCode: ErrorCode.INVALID_INPUT,
      },
      { status: StatusCode.BAD_REQUEST }
    );
  }

  const { url, text } = (body as { url?: unknown; text?: unknown }) || {};
  const safeUrl = typeof url === "string" ? url : undefined;
  const safeText = typeof text === "string" ? text : undefined;
  logger.debug("Request received", { hasUrl: !!safeUrl, hasText: !!safeText });

  // Validate input
  if (!safeUrl && !safeText) {
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
  const ip = extractClientIp(request);
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

  // Content sanitization for text input
  if (safeText) {
    const contentCheck = validateInputContent(safeText);
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

  return { url: safeUrl, text: safeText, ip, isSuspicious };
}
