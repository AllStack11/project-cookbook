/**
 * Token Counter Utility
 *
 * Estimates token count for content and provides truncation logic.
 * Uses a simple heuristic: ~4 characters per token (Claude's average).
 */

const CHARS_PER_TOKEN = 4;
export const MAX_TOKENS = 3000;
export const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

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

export function truncateToMaxTokens(text: string, maxTokens: number = MAX_TOKENS): string {
  if (!text) return '';

  const maxChars = maxTokens * CHARS_PER_TOKEN;

  if (text.length <= maxChars) {
    return text;
  }

  // Truncate at word boundary to avoid cutting words
  let truncated = text.substring(0, maxChars);
  const lastSpaceIndex = truncated.lastIndexOf(' ');

  if (lastSpaceIndex > maxChars * 0.9) {
    truncated = truncated.substring(0, lastSpaceIndex);
  }

  return truncated;
}

export function canFitInContext(text: string, maxTokens: number = MAX_TOKENS): boolean {
  return estimateTokens(text) <= maxTokens;
}

export function getTokenBudget(usedTokens: number, maxTokens: number = MAX_TOKENS): number {
  return Math.max(0, maxTokens - usedTokens);
}
