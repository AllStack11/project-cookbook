/**
 * Developer Logging Utility
 *
 * Controlled by ENABLE_DEBUG_LOGGING environment variable
 * Set to 'true' in development, 'false' or omit in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const debugEnabled = process.env.ENABLE_DEBUG_LOGGING === 'true' || isDevelopment;

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  PERF = 'PERF', // Performance timing
}

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
  duration?: number;
}

class Logger {
  private context: string;

  constructor(context: string = 'App') {
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (!debugEnabled && level !== LogLevel.ERROR) {
      // In production, only log errors
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.context}]`;

    const logEntry: LogEntry = {
      level,
      message,
      data,
      timestamp,
    };

    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, data || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LogLevel.PERF:
        console.log(`⏱️  ${prefix}`, message, data || '');
        break;
      case LogLevel.INFO:
        console.log(`ℹ️  ${prefix}`, message, data || '');
        break;
      case LogLevel.DEBUG:
        console.log(`🔍 ${prefix}`, message, data || '');
        break;
      default:
        console.log(prefix, message, data || '');
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
    this.log(LogLevel.PERF, `${message} (${duration}ms)`, { duration });
  }

  /**
   * Performance timer utility
   */
  startTimer(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.perf(label, duration);
      return duration;
    };
  }
}

/**
 * Create a logger instance for a specific context
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
  return debugEnabled;
}
