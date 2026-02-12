export interface LLMProviderErrorOptions {
  code:
    | "config_error"
    | "rate_limited"
    | "timeout"
    | "provider_unavailable"
    | "invalid_request"
    | "unknown";
  errorClass?: LLMErrorClass;
  retryable: boolean;
  statusCode?: number;
  cause?: unknown;
}

export type LLMErrorClass =
  | "provider_runtime"
  | "invalid_request"
  | "parse_validation"
  | "unknown";

export class LLMProviderError extends Error {
  code: LLMProviderErrorOptions["code"];
  errorClass: LLMErrorClass;
  retryable: boolean;
  statusCode?: number;
  cause?: unknown;

  constructor(message: string, options: LLMProviderErrorOptions) {
    super(message);
    this.name = "LLMProviderError";
    this.code = options.code;
    this.errorClass = options.errorClass || "unknown";
    this.retryable = options.retryable;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
  }
}

export function classifyLLMError(error: unknown): LLMErrorClass {
  if (error instanceof LLMProviderError) {
    return error.errorClass;
  }
  return "unknown";
}
