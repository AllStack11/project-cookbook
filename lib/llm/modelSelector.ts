// LLM Model identifiers
export const GEMINI_FLASH = "gemini-2.5-flash-lite";

export interface ModelSelectionCriteria {
  contentLength: number;
  sourceType: string;
  requestCount: number;
  isRetry?: boolean;
  previousModel?: string;
}

export function selectModel(_criteria: ModelSelectionCriteria): string {
  return GEMINI_FLASH;
}
