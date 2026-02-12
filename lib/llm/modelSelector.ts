// LLM Model identifiers
export const GEMINI_FLASH_LITE = "gemini-2.5-flash-lite";
export const GEMINI_FLASH = "gemini-2.0-flash";

export interface ModelSelectionCriteria {
  contentLength: number;
  sourceType: string;
  requestCount: number;
  isRetry?: boolean;
  previousModel?: string;
}

/**
 * Selects the appropriate Gemini model based on content and request characteristics.
 *
 * - Uses flash-lite (cheaper, faster) for most requests
 * - Upgrades to flash for retries, long content, or complex source types
 */
export function selectModel(criteria: ModelSelectionCriteria): string {
  // Always upgrade on retry if previous attempt used lite
  if (criteria.isRetry && criteria.previousModel === GEMINI_FLASH_LITE) {
    return GEMINI_FLASH;
  }

  // Long content benefits from the more capable model
  if (criteria.contentLength > 10000) {
    return GEMINI_FLASH;
  }

  // Default: use flash-lite for cost efficiency
  return GEMINI_FLASH_LITE;
}
