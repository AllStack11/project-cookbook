import { Recipe } from '@/types/recipe';
import { createHash } from 'crypto';

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

export function generateCacheKey(url: string): string {
  return createHash('sha256').update(url.toLowerCase().trim()).digest('hex');
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
  setTimeout(() => {
    cache.delete(key);
  }, ttl);
}

export async function invalidateCache(url: string): Promise<void> {
  const key = generateCacheKey(url);
  cache.delete(key);
}

export async function getCacheStats(): Promise<{ size: number; hits: number; misses: number }> {
  return {
    size: cache.size,
    hits: 0, // Would track in production
    misses: 0,
  };
}
