export const CLAUDE_HAIKU = 'claude-haiku-20240307';
export const CLAUDE_SONNET = 'claude-3-5-sonnet-20241022';

export interface ModelSelectionCriteria {
  contentLength: number;
  sourceType: string;
  isRetry?: boolean;
  previousModel?: string;
}

export function selectModel(criteria: ModelSelectionCriteria): string {
  // If this is a retry after Haiku failed, use Sonnet
  if (criteria.isRetry && criteria.previousModel === CLAUDE_HAIKU) {
    return CLAUDE_SONNET;
  }

  // For very long content or complex sources, use Sonnet
  if (criteria.contentLength > 8000) {
    return CLAUDE_SONNET;
  }

  // Default to Haiku for cost optimization
  return CLAUDE_HAIKU;
}

export function shouldRetryWithBetterModel(
  currentModel: string,
  validationFailed: boolean
): boolean {
  // Only retry with a better model if we used Haiku and validation failed
  return validationFailed && currentModel === CLAUDE_HAIKU;
}
