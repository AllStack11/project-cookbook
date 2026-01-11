import { Recipe } from "@/types/recipe";
import { createHash } from "crypto";
import { kv } from "@vercel/kv";

// TTLs in seconds for Redis
export const TTL_BLOG = 30 * 24 * 60 * 60; // 30 days
export const TTL_SOCIAL = 7 * 24 * 60 * 60; // 7 days
export const TTL_DEFAULT = TTL_BLOG;

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
  try {
    const key = generateCacheKey(url);
    const recipe = await kv.get<Recipe>(`recipe:${key}`);
    return recipe;
  } catch (error) {
    console.error("Cache get error:", error);
    return null;
  }
}

export async function setCachedRecipe(
  url: string,
  recipe: Recipe,
  ttl: number = TTL_DEFAULT
): Promise<void> {
  try {
    const key = generateCacheKey(url);
    // Vercel KV set takes seconds for ex option
    await kv.set(`recipe:${key}`, recipe, { ex: ttl });
  } catch (error) {
    console.error("Cache set error:", error);
  }
}

export async function invalidateCache(url: string): Promise<void> {
  try {
    const key = generateCacheKey(url);
    await kv.del(`recipe:${key}`);
  } catch (error) {
    console.error("Cache invalidate error:", error);
  }
}

export async function getCacheStats(): Promise<{
  size: number;
  hits: number;
  misses: number;
}> {
  try {
    // dbsize gives total keys in the database
    const size = await kv.dbsize();
    return {
      size,
      hits: 0, // KV doesn't provide easy hit/miss stats via REST API
      misses: 0,
    };
  } catch (error) {
    console.error("Cache stats error:", error);
    return { size: 0, hits: 0, misses: 0 };
  }
}
