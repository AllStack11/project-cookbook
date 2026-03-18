import { Recipe } from "@/types/recipe";
import { createHash } from "crypto";
import { kv } from "@vercel/kv";
import { createLogger } from "@/lib/utils/logger";
import { retryWithBackoff } from "@/lib/utils/retry";

const logger = createLogger("Cache:Client");

// TTLs in seconds for Redis
export const TTL_BLOG = 30 * 24 * 60 * 60; // 30 days
export const TTL_SOCIAL = 7 * 24 * 60 * 60; // 7 days
export const TTL_DEFAULT = TTL_BLOG;

/**
 * Wraps KV calls with a timeout to prevent hanging the entire request.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 1000
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("KV Operation Timeout")), timeoutMs),
  );
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Normalizes a URL to ensure consistent cache keys.
 * Handles tracking parameters, platform-specific formats (YouTube, Instagram, TikTok),
 * and sorts query parameters.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // 1. Platform Specific Normalization
    const hostname = parsed.hostname.toLowerCase();

    // YouTube: Normalize all formats to https://www.youtube.com/watch?v=VIDEO_ID
    if (hostname.includes("youtube.com") || hostname === "youtu.be") {
      let videoId = parsed.searchParams.get("v");

      // Handle youtu.be/VIDEO_ID
      if (!videoId && hostname === "youtu.be") {
        videoId = parsed.pathname.substring(1);
      }

      // Handle youtube.com/shorts/VIDEO_ID or youtube.com/embed/VIDEO_ID
      if (!videoId) {
        const parts = parsed.pathname.split("/");
        if (
          parts.includes("shorts") ||
          parts.includes("embed") ||
          parts.includes("v")
        ) {
          videoId = parts[parts.length - 1];
        }
      }

      if (videoId) {
        return `https://www.youtube.com/watch?v=${videoId.toLowerCase()}`;
      }
    }

    // Instagram: Strip everything except the path (post ID)
    if (hostname.includes("instagram.com")) {
      const normalized = new URL(parsed.origin + parsed.pathname);
      // Remove trailing slash for consistency
      let path = normalized.pathname;
      if (path.endsWith("/")) path = path.slice(0, -1);
      return (parsed.origin + path).toLowerCase();
    }

    // TikTok: Strip tracking params, usually the path is enough
    if (hostname.includes("tiktok.com")) {
      const normalized = new URL(parsed.origin + parsed.pathname);
      return normalized.toString().toLowerCase();
    }

    // 2. Generic Normalization for Blogs and other sites
    // Whitelist approach: Only keep parameters that likely define content
    const essentialParams = [
      "p", // WordPress post ID
      "id", // Generic ID
      "page", // Pagination
      "recipe_id", // Specific to some sites
      "article", // Generic article ID
    ];

    const newParams = new URLSearchParams();
    essentialParams.forEach((param) => {
      const value = parsed.searchParams.get(param);
      if (value) {
        newParams.append(param, value);
      }
    });

    // Sort essential parameters
    newParams.sort();

    const result = new URL(parsed.origin + parsed.pathname);
    newParams.forEach((value, key) => {
      result.searchParams.set(key, value);
    });

    // Final cleanup: remove trailing slash and lowercase
    let finalUrl = result.toString().toLowerCase();
    if (finalUrl.endsWith("/") && !parsed.pathname.endsWith("/")) {
      // Keep it if the original had it (some sites depend on it)
    } else if (finalUrl.endsWith("/") && finalUrl.split("/").length > 3) {
      // Generally safe to strip trailing slash for canonicalization on deep paths
      finalUrl = finalUrl.slice(0, -1);
    }

    return finalUrl.trim();
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
    const recipe = await retryWithBackoff(
      () => withTimeout(kv.get<Recipe>(`recipe:${key}`)),
      {
        maxRetries: 0,
        initialDelayMs: 0,
      },
      "Cache:Get",
    );
    return recipe;
  } catch (error) {
    logger.error("Cache get error", {
      error,
      url,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function setCachedRecipe(
  url: string,
  recipe: Recipe,
  ttl: number = TTL_DEFAULT,
): Promise<void> {
  try {
    const key = generateCacheKey(url);
    // Vercel KV set takes seconds for ex option
    await retryWithBackoff(
      () => withTimeout(kv.set(`recipe:${key}`, recipe, { ex: ttl })),
      {
        maxRetries: 1,
        initialDelayMs: 1000,
        maxDelayMs: 2000,
      },
      "Cache:Set",
    );
  } catch (error) {
    logger.error("Cache set error", {
      error,
      url,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function invalidateCache(url: string): Promise<void> {
  try {
    const key = generateCacheKey(url);
    await retryWithBackoff(
      () => withTimeout(kv.del(`recipe:${key}`)),
      {
        maxRetries: 1,
        initialDelayMs: 1000,
      },
      "Cache:Invalidate",
    );
  } catch (error) {
    logger.error("Cache invalidate error", { error, url });
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
    logger.error("Cache stats error", { error });
    return { size: 0, hits: 0, misses: 0 };
  }
}
