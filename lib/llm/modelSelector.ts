// LLM Model identifiers
export const DEEPSEEK_CHAT = "deepseek-chat";
export const GEMINI_FLASH = "gemini-3-flash-preview";

export interface ModelSelectionCriteria {
  contentLength: number;
  sourceType: string;
  requestCount: number;
  isRetry?: boolean;
  previousModel?: string;
}

export function selectModel(criteria: ModelSelectionCriteria): string {
  // Always use Gemini 3 Flash for YouTube as it handles messy transcripts better
  if (criteria.sourceType === "youtube") {
    return GEMINI_FLASH;
  }

  // Use Gemini 3 Flash for the first 5 requests (expanded from 2)
  if (criteria.requestCount < 5) {
    return GEMINI_FLASH;
  }

  // Use DeepSeek for subsequent requests to balance costs
  return DEEPSEEK_CHAT;
}

export function shouldRetryWithBetterModel(
  currentModel: string,
  validationFailed: boolean
): boolean {
  // Currently we only have two models and one is used after the other
  // In the future, we could retry with deepseek-reasoner if deepseek-chat fails
  return false;
}
