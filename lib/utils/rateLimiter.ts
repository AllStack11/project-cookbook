export const FREE_TIER_LIMIT = 10; // requests per day
export const SUSPICIOUS_TIER_LIMIT = 2; // Strict limit for VPNs/Proxies
export const RAPID_REQUEST_THRESHOLD = 3; // requests within short window

import { kv } from "@vercel/kv";
import { createLogger } from "./logger";

const logger = createLogger("Utils:RateLimiter");

export async function checkRateLimit(
  ip: string,
  isSuspicious = false
): Promise<{ allowed: boolean; remaining: number; resetAt?: number }> {
  const limit = isSuspicious ? SUSPICIOUS_TIER_LIMIT : FREE_TIER_LIMIT;
  const key = `rate_limit:${ip}`;

  try {
    const count = (await kv.get<number>(key)) || 0;

    if (count >= limit) {
      // Get remaining TTL to tell user when it resets
      const ttl = await kv.ttl(key);
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
    logger.error("Rate limit check error - failing closed", { error });
    // Fail closed: deny requests when rate limiter is unavailable
    return { allowed: false, remaining: 0 };
  }
}

export async function getRequestCount(ip: string): Promise<number> {
  try {
    return (await kv.get<number>(`rate_limit:${ip}`)) || 0;
  } catch (error) {
    logger.error("Get request count error:", error);
    return 0;
  }
}

export async function incrementRateLimit(ip: string): Promise<void> {
  const key = `rate_limit:${ip}`;
  const dayInSeconds = 24 * 60 * 60;

  try {
    const multi = kv.multi();
    multi.incr(key);
    // Only set expiry if it's a new key (TTL will be -1)
    // Actually, INCR + EXPIRE with NX is easier in traditional Redis,
    // but here we can just check if it was 1 after increment
    const results = await multi.exec();
    const newCount = results[0] as number;

    if (newCount === 1) {
      await kv.expire(key, dayInSeconds);
    }

    // Also track recent requests for CAPTCHA
    const recentKey = `recent_requests:${ip}`;
    await kv.lpush(recentKey, Date.now());
    await kv.ltrim(recentKey, 0, 9); // Keep last 10
    await kv.expire(recentKey, 5 * 60); // 5 minutes
  } catch (error) {
    logger.error("Increment rate limit error:", error);
  }
}

export async function shouldShowCaptcha(ip: string): Promise<boolean> {
  const recentKey = `recent_requests:${ip}`;
  try {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const recentRequests = await kv.lrange<number>(recentKey, 0, -1);

    const rapidCount = recentRequests.filter((t) => t > fiveMinutesAgo).length;
    return rapidCount >= RAPID_REQUEST_THRESHOLD;
  } catch (error) {
    logger.error("Should show captcha error:", error);
    return false;
  }
}

export async function resetRateLimit(ip: string): Promise<void> {
  try {
    await kv.del(`rate_limit:${ip}`, `recent_requests:${ip}`);
  } catch (error) {
    logger.error("Reset rate limit error:", error);
  }
}
