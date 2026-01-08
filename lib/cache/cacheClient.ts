import { Recipe } from "@/types/recipe";
import { createHash } from "crypto";

export interface CacheEntry {
  recipe: Recipe;
  timestamp: number;
  sourceUrl: string;
}

export const TTL_BLOG = 30 * 24 * 60 * 60 * 1000; // 30 days
export const TTL_SOCIAL = 7 * 24 * 60 * 60 * 1000; // 7 days
export const TTL_DEFAULT = TTL_BLOG;

// Simple in-memory cache for development
// In production, use Redis or Vercel KV
const cache = new Map<string, CacheEntry>();

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove common tracking parameters
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "msclkid",
      "mc_eid",
      "v", // Some video platforms use this for player version
    ];

    // Special handling for YouTube - keep 'v' for video ID, but strip others
    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname === "youtu.be"
    ) {
      const searchParams = parsed.searchParams;
      const videoId = searchParams.get("v");
      const normalized = new URL(parsed.origin + parsed.pathname);
      if (videoId) normalized.searchParams.set("v", videoId);
      return normalized.toString().toLowerCase().trim();
    }

    paramsToRemove.forEach((param) => parsed.searchParams.delete(param));
    // Sort parameters to ensure consistent key generation
    parsed.searchParams.sort();

    return parsed.toString().toLowerCase().trim();
  } catch (e) {
    return url.toLowerCase().trim();
  }
}

export function generateCacheKey(url: string): string {
  const normalized = normalizeUrl(url);
  return createHash("sha256").update(normalized).digest("hex");
}

export async function getCachedRecipe(url: string): Promise<Recipe | null> {
  const key = generateCacheKey(url);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Check if expired
  const now = Date.now();
  const age = now - entry.timestamp;

  if (age > TTL_DEFAULT) {
    cache.delete(key);
    return null;
  }

  return entry.recipe;
}

export async function setCachedRecipe(
  url: string,
  recipe: Recipe,
  ttl: number = TTL_DEFAULT
): Promise<void> {
  const key = generateCacheKey(url);
  cache.set(key, {
    recipe,
    timestamp: Date.now(),
    sourceUrl: url,
  });

  // Auto-expire after TTL
  // Note: setTimeout max is ~24.8 days (2^31-1 ms), so we skip it for long TTLs
  // Expiry is still checked via timestamp in getCachedRecipe
  const MAX_TIMEOUT = 2147483647; // Max 32-bit signed integer
  if (ttl < MAX_TIMEOUT) {
    setTimeout(() => {
      cache.delete(key);
    }, ttl);
  }
  // For longer TTLs, rely on timestamp-based expiry check in getCachedRecipe
}

export async function invalidateCache(url: string): Promise<void> {
  const key = generateCacheKey(url);
  cache.delete(key);
}

export async function getCacheStats(): Promise<{
  size: number;
  hits: number;
  misses: number;
}> {
  return {
    size: cache.size,
    hits: 0, // Would track in production
    misses: 0,
  };
}
