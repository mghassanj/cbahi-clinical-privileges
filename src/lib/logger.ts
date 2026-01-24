/**
 * Structured Logger Utility
 *
 * Provides consistent logging across the application with:
 * - Log levels (debug, info, warn, error)
 * - Structured output in production
 * - Console output in development
 * - Context/metadata support
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = (): number => {
  const level = process.env.LOG_LEVEL as LogLevel || 'info';
  return LOG_LEVELS[level] ?? LOG_LEVELS.info;
};

const isProduction = process.env.NODE_ENV === 'production';

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();

  if (isProduction) {
    // Structured JSON logging for production
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...context,
    });
  }

  // Human-readable format for development
  const contextStr = context ? ` ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= currentLevel();
}

export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext): void {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (shouldLog('error')) {
      const errorContext: LogContext = { ...context };

      if (error instanceof Error) {
        errorContext.errorName = error.name;
        errorContext.errorMessage = error.message;
        if (!isProduction) {
          errorContext.stack = error.stack;
        }
      } else if (error) {
        errorContext.error = String(error);
      }

      console.error(formatMessage('error', message, errorContext));
    }
  },

  // Create a child logger with preset context
  child(defaultContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...defaultContext, ...context }),
      error: (message: string, error?: Error | unknown, context?: LogContext) =>
        logger.error(message, error, { ...defaultContext, ...context }),
    };
  },
};

export default logger;
