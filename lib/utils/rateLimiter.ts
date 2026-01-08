export const FREE_TIER_LIMIT = 10; // requests per day
export const RAPID_REQUEST_THRESHOLD = 3; // requests within short window

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  recentRequests: number[];
}

// Simple in-memory storage for development
// In production, use Redis
const rateLimitStore = new Map<string, RateLimitEntry>();

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number; resetAt?: number }> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  let entry = rateLimitStore.get(ip);

  if (!entry) {
    entry = {
      count: 0,
      firstRequest: now,
      recentRequests: [],
    };
    rateLimitStore.set(ip, entry);
  }

  // Reset if day has passed
  if (now - entry.firstRequest > dayMs) {
    entry.count = 0;
    entry.firstRequest = now;
    entry.recentRequests = [];
  }

  // Clean old recent requests (older than 5 minutes)
  entry.recentRequests = entry.recentRequests.filter(t => now - t < 5 * 60 * 1000);

  if (entry.count >= FREE_TIER_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.firstRequest + dayMs,
    };
  }

  return {
    allowed: true,
    remaining: FREE_TIER_LIMIT - entry.count - 1,
  };
}

export async function incrementRateLimit(ip: string): Promise<void> {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (entry) {
    entry.count++;
    entry.recentRequests.push(now);
  }
}

export async function shouldShowCaptcha(ip: string): Promise<boolean> {
  const entry = rateLimitStore.get(ip);
  if (!entry) return false;

  // Show CAPTCHA if 3+ requests within 5 minutes
  return entry.recentRequests.length >= RAPID_REQUEST_THRESHOLD;
}

export async function resetRateLimit(ip: string): Promise<void> {
  rateLimitStore.delete(ip);
}
