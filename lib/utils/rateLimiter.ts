export const FREE_TIER_LIMIT = 10; // requests per day
export const SUSPICIOUS_TIER_LIMIT = 2; // Strict limit for VPNs/Proxies
export const RAPID_REQUEST_THRESHOLD = 3; // requests within short window

import { kv } from "@vercel/kv";
import { createLogger } from "./logger";
import { retryWithBackoff } from "./retry";

const logger = createLogger("Utils:RateLimiter");

/**
 * Wraps KV calls with a timeout to prevent hanging the entire request.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 1000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("KV Operation Timeout")), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === "development";
}

export async function checkRateLimit(
  ip: string,
  isSuspicious = false
): Promise<{ allowed: boolean; remaining: number; resetAt?: number }> {
  const limit = isSuspicious ? SUSPICIOUS_TIER_LIMIT : FREE_TIER_LIMIT;
  if (isDevelopmentMode()) {
    return { allowed: true, remaining: limit };
  }

  const key = `rate_limit:${ip}`;

  try {
    const count = await retryWithBackoff(
      () => withTimeout(kv.get<number>(key)),
      { maxRetries: 1, initialDelayMs: 1000 },
      "RateLimit:Get"
    ) || 0;

    if (count >= limit) {
      // Get remaining TTL to tell user when it resets
      const ttl = await withTimeout(kv.ttl(key)).catch(() => -1);
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + (ttl > 0 ? ttl * 1000 : 0),
      };
    }

    return {
      allowed: true,
      remaining: limit - count - 1,
    };
  } catch (error) {
    logger.error("Rate limit check error - failing open", {
      error,
      ip,
      isSuspicious,
      message: error instanceof Error ? error.message : String(error),
    });
    // Fail open: allow requests when rate limiter is unavailable to prevent total outage
    return { allowed: true, remaining: 1 };
  }
}

export async function getRequestCount(ip: string): Promise<number> {
  if (isDevelopmentMode()) {
    return 0;
  }

  try {
    return (await retryWithBackoff(
      () => withTimeout(kv.get<number>(`rate_limit:${ip}`)),
      { maxRetries: 1, initialDelayMs: 1000 },
      "RateLimit:GetCount"
    )) || 0;
  } catch (error) {
    logger.error("Get request count error:", {
      error,
      ip,
      message: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

export async function incrementRateLimit(ip: string): Promise<void> {
  if (isDevelopmentMode()) {
    return;
  }

  const key = `rate_limit:${ip}`;
  const dayInSeconds = 24 * 60 * 60;

  try {
    await retryWithBackoff(
      async () => {
        const multi = kv.multi();
        multi.incr(key);
        const results = await withTimeout(multi.exec());
        const newCount = results[0] as number;

        if (newCount === 1) {
          await withTimeout(kv.expire(key, dayInSeconds));
        }

        // Also track recent requests for CAPTCHA
        const recentKey = `recent_requests:${ip}`;
        await withTimeout(kv.lpush(recentKey, Date.now()));
        await withTimeout(kv.ltrim(recentKey, 0, 9)); // Keep last 10
        await withTimeout(kv.expire(recentKey, 5 * 60)); // 5 minutes
      },
      { maxRetries: 1, initialDelayMs: 1000 },
      "RateLimit:Increment"
    );
  } catch (error) {
    logger.error("Increment rate limit error:", {
      error,
      ip,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function shouldShowCaptcha(ip: string): Promise<boolean> {
  if (isDevelopmentMode()) {
    return false;
  }

  const recentKey = `recent_requests:${ip}`;
  try {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const recentRequests = await retryWithBackoff(
      () => withTimeout(kv.lrange<number>(recentKey, 0, -1)),
      { maxRetries: 1, initialDelayMs: 1000 },
      "RateLimit:GetRecent"
    );

    const rapidCount = recentRequests.filter((t) => t > fiveMinutesAgo).length;
    return rapidCount >= RAPID_REQUEST_THRESHOLD;
  } catch (error) {
    logger.error("Should show captcha error:", error);
    return false;
  }
}

export async function resetRateLimit(ip: string): Promise<void> {
  if (isDevelopmentMode()) {
    return;
  }

  try {
    await retryWithBackoff(
      () => withTimeout(kv.del(`rate_limit:${ip}`, `recent_requests:${ip}`)),
      { maxRetries: 1, initialDelayMs: 1000 },
      "RateLimit:Reset"
    );
  } catch (error) {
    logger.error("Reset rate limit error:", error);
  }
}
