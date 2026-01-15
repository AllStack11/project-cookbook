/**
 * Retry Utility with Exponential Backoff
 *
 * Handles transient failures (timeouts, network issues) with intelligent retry logic.
 * Does not retry permanent failures (CAPTCHA, auth walls, invalid URLs).
 */

import { createLogger } from "./logger";

const logger = createLogger("Utils:Retry");

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: string[];
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  retryableErrors: [
    "timeout",
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENOTFOUND",
    "Navigation timeout",
    "net::ERR_",
    "Protocol error",
  ],
};

/**
 * Determines if an error is retryable based on error message patterns
 */
function isRetryableError(error: Error, retryablePatterns: string[]): boolean {
  const errorMessage = error.message.toLowerCase();

  // Never retry authentication or CAPTCHA errors
  if (
    errorMessage.includes("captcha") ||
    errorMessage.includes("login") ||
    errorMessage.includes("authentication") ||
    errorMessage.includes("auth required")
  ) {
    return false;
  }

  // Check if error matches any retryable pattern
  return retryablePatterns.some((pattern) =>
    errorMessage.includes(pattern.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number
): number {
  const exponentialDelay = initialDelay * Math.pow(2, attempt - 1);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - The async function to retry
 * @param options - Retry configuration options
 * @param context - Context string for logging (e.g., "Instagram extraction")
 * @returns The result of the operation
 * @throws The last error if all retries fail
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => scrapeInstagramContent(url),
 *   { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 8000 },
 *   'Instagram extraction'
 * );
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  context: string = "Operation"
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      logger.debug(`${context}: Attempt ${attempt}/${config.maxRetries + 1}`);

      const result = await operation();

      if (attempt > 1) {
        logger.info(`${context}: Succeeded on attempt ${attempt}`, {
          totalAttempts: attempt,
          retriesNeeded: attempt - 1,
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, throw the error
      if (attempt > config.maxRetries) {
        logger.error(`${context}: All ${config.maxRetries} retries exhausted`, {
          error: lastError.message,
          totalAttempts: attempt,
        });
        throw lastError;
      }

      // Check if error is retryable
      const shouldRetry = config.shouldRetry
        ? config.shouldRetry(lastError, attempt)
        : isRetryableError(
            lastError,
            config.retryableErrors || DEFAULT_OPTIONS.retryableErrors!
          );

      if (!shouldRetry) {
        logger.info(`${context}: Error is not retryable, failing immediately`, {
          error: lastError.message,
          attempt,
        });
        throw lastError;
      }

      // Calculate delay and wait before retrying
      const delay = calculateDelay(
        attempt,
        config.initialDelayMs,
        config.maxDelayMs
      );

      logger.warn(
        `${context}: Attempt ${attempt} failed, retrying in ${delay}ms`,
        {
          error: lastError.message,
          remainingRetries: config.maxRetries - attempt,
          delayMs: delay,
        }
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Retry failed with unknown error");
}
