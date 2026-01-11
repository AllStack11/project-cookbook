/**
 * Structured Logging Utility for Vercel
 *
 * Optimized for Vercel's native log collection and search
 * Logs are automatically captured and indexed by Vercel
 *
 * Features:
 * - Structured JSON logging for easy querying in Vercel dashboard
 * - Context-aware loggers (e.g., 'API:Extract', 'LLM:Gemini')
 * - Performance timing utilities
 * - Configurable log levels for development/production
 *
 * Environment Variables:
 * - LOG_LEVEL: Minimum log level - DEBUG, INFO, WARN, or ERROR
 *   - DEBUG: Show all logs (verbose, for development)
 *   - INFO: Show info, warn, error, perf, cost, metrics (recommended for production)
 *   - WARN: Show only warnings and errors (very quiet)
 *   - ERROR: Show only errors
 *   - Default: DEBUG in development, INFO in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Log level hierarchy: DEBUG < INFO < WARN < ERROR
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  PERF = 'PERF', // Performance timing
}

// Determine minimum log level from environment
const getMinLogLevel = (): number => {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();
  if (envLevel && envLevel in LOG_LEVELS) {
    return LOG_LEVELS[envLevel as keyof typeof LOG_LEVELS];
  }
  // Default: DEBUG in development, INFO in production
  return isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO;
};

const MIN_LOG_LEVEL = getMinLogLevel();

interface LogMetadata {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: any;
  duration?: number;
}

class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === LogLevel.ERROR) return true;
    // PERF logs follow INFO level rules
    if (level === LogLevel.PERF) {
      return MIN_LOG_LEVEL <= LOG_LEVELS.INFO;
    }
    // Check against minimum log level
    const levelValue = LOG_LEVELS[level as keyof typeof LOG_LEVELS];
    return levelValue !== undefined && levelValue >= MIN_LOG_LEVEL;
  }

  /**
   * Core logging method - outputs structured JSON for Vercel log indexing
   */
  private log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogMetadata = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
    };

    // Add data if provided (Vercel will index these fields)
    if (data !== undefined && data !== null && data !== '') {
      logEntry.data = data;
    }

    // Output structured JSON for Vercel
    // Vercel parses JSON logs and makes fields searchable
    switch (level) {
      case LogLevel.ERROR:
        console.error(JSON.stringify(logEntry));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(logEntry));
        break;
      case LogLevel.PERF:
      case LogLevel.INFO:
      case LogLevel.DEBUG:
      default:
        console.log(JSON.stringify(logEntry));
        break;
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any) {
    this.log(LogLevel.ERROR, message, error);
  }

  perf(message: string, duration: number) {
    this.log(LogLevel.PERF, message, { duration });
  }

  /**
   * Performance timer utility
   * Returns a function that when called, logs the elapsed time
   */
  startTimer(label: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.perf(label, duration);
      return duration;
    };
  }

  /**
   * Log with custom fields for better Vercel searchability
   * Example: logger.structured('User action', { userId: '123', action: 'signup' })
   */
  structured(message: string, fields: Record<string, any>, level: LogLevel = LogLevel.INFO) {
    this.log(level, message, fields);
  }

  /**
   * Log cost-related metrics (LLM usage, cache hits, etc.)
   * These are critical for monitoring your cost optimization goals
   */
  cost(message: string, metrics: {
    tokensUsed?: number;
    modelUsed?: string;
    cacheHit?: boolean;
    estimatedCost?: number;
  }) {
    this.log(LogLevel.INFO, `[COST] ${message}`, metrics);
  }

  /**
   * Log business metrics (extractions, conversions, etc.)
   */
  metric(name: string, value: number, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, `[METRIC] ${name}`, {
      metricName: name,
      value,
      ...metadata,
    });
  }
}

/**
 * Create a logger instance for a specific context
 * Example: const logger = createLogger('API:Extract')
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Default logger instance
 */
export const logger = new Logger('App');

/**
 * Check if debug logging is enabled
 */
export function isDebugEnabled(): boolean {
  return MIN_LOG_LEVEL <= LOG_LEVELS.DEBUG;
}

/**
 * Helper to log the start and end of an async operation
 * Example:
 *   const result = await logOperation('Extracting recipe', async () => {
 *     return await extractRecipe(url);
 *   });
 */
export async function logOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  context: string = 'App'
): Promise<T> {
  const logger = createLogger(context);
  const endTimer = logger.startTimer(operationName);

  try {
    logger.info(`Starting: ${operationName}`);
    const result = await operation();
    endTimer();
    logger.info(`Completed: ${operationName}`);
    return result;
  } catch (error) {
    endTimer();
    logger.error(`Failed: ${operationName}`, error);
    throw error;
  }
}
