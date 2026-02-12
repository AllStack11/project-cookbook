import { Recipe } from './recipe';

export enum StatusCode {
  OK = 200,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  RATE_LIMITED = 429,
  SERVICE_UNAVAILABLE = 503,
  INTERNAL_SERVER_ERROR = 500,
}

export interface ExtractRequestBody {
  url?: string;
  text?: string;
}

export interface ExtractSuccessResponse {
  success: true;
  recipe: Recipe;
  metadata: {
    cacheHit: boolean;
    modelUsed: string;
    providerUsed?: string;
    tokensUsed?: number;
    processingTime: number;
    fallbackTierUsed?: "free_only" | "paid_fallback";
    freeAttemptFailedReason?: string;
  };
}

export interface ExtractErrorResponse {
  success: false;
  error: string;
  errorCode: ErrorCode;
}

export type ExtractResponse = ExtractSuccessResponse | ExtractErrorResponse;

export enum ErrorCode {
  INVALID_URL = 'INVALID_URL',
  INVALID_INPUT = 'INVALID_INPUT',
  NO_RECIPE_FOUND = 'NO_RECIPE_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
