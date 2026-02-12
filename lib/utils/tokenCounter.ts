/**
 * Token Counter Utility
 *
 * Estimates token count for content and provides truncation logic.
 * Uses a simple heuristic: ~4 characters per token (Claude's average).
 */

const CHARS_PER_TOKEN = 4;
export const MAX_TOKENS = 3000;
export const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

// Budgets per source type
export const MAX_TOKENS_SOCIAL = 1500;
export const MAX_TOKENS_BLOG = 2500;
export const MAX_TOKENS_YOUTUBE = 4000;

export interface TokenEstimate {
  tokens: number;
  characters: number;
  isTruncated: boolean;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

export function estimateTokensWithInfo(text: string): TokenEstimate {
  const characters = text?.length || 0;
  const tokens = estimateTokens(text);
  const isTruncated = tokens > MAX_TOKENS;

  return {
    tokens,
    characters,
    isTruncated,
  };
}

export function truncateToMaxTokens(
  text: string,
  maxTokens: number = MAX_TOKENS
): string {
  if (!text) return "";

  const maxChars = maxTokens * CHARS_PER_TOKEN;

  if (text.length <= maxChars) {
    return text;
  }

  // Truncate at word boundary to avoid cutting words
  let truncated = text.substring(0, maxChars);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  if (lastSpaceIndex > maxChars * 0.8) {
    truncated = truncated.substring(0, lastSpaceIndex);
  } else {
    // If no space found in the last 20% of the truncated text, just trim trailing spaces
    truncated = truncated.trimEnd();
  }

  return truncated;
}

export function canFitInContext(
  text: string,
  maxTokens: number = MAX_TOKENS
): boolean {
  return estimateTokens(text) <= maxTokens;
}

export function getTokenBudget(
  usedTokens: number,
  maxTokens: number = MAX_TOKENS
): number {
  return Math.max(0, maxTokens - usedTokens);
}

/**
 * Returns the appropriate max token budget for a given source type.
 * Social media posts are shorter, blogs are medium, YouTube transcripts are longer.
 */
export function getMaxTokensForSource(sourceType: string): number {
  switch (sourceType) {
    case "instagram":
    case "tiktok":
    case "social":
      return MAX_TOKENS_SOCIAL;
    case "blog":
    case "website":
      return MAX_TOKENS_BLOG;
    case "youtube":
      return MAX_TOKENS_YOUTUBE;
    default:
      return MAX_TOKENS;
  }
}
