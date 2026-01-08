// DeepSeek models
export const DEEPSEEK_CHAT = 'deepseek-chat';
export const DEEPSEEK_REASONER = 'deepseek-reasoner';

export interface ModelSelectionCriteria {
  contentLength: number;
  sourceType: string;
  isRetry?: boolean;
  previousModel?: string;
}

export function selectModel(criteria: ModelSelectionCriteria): string {
  // If this is a retry after regular chat model failed, use reasoner
  if (criteria.isRetry && criteria.previousModel === DEEPSEEK_CHAT) {
    return DEEPSEEK_REASONER;
  }

  // For very long content or complex sources, use reasoner model
  if (criteria.contentLength > 8000) {
    return DEEPSEEK_REASONER;
  }

  // Default to chat model for cost optimization
  return DEEPSEEK_CHAT;
}

export function shouldRetryWithBetterModel(
  currentModel: string,
  validationFailed: boolean
): boolean {
  // Only retry with reasoner if we used chat and validation failed
  return validationFailed && currentModel === DEEPSEEK_CHAT;
}
