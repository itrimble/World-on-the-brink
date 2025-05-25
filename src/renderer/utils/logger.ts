// src/renderer/utils/logger.ts

/**
 * Defines the available log levels.
 * Lower numbers indicate higher verbosity.
 */
enum LogLevel {
  /** Detailed debugging information, typically for development. */
  DEBUG = 0,
  /** General information about application flow. */
  INFO = 1,
  /** Warnings about potential issues or unexpected behavior. */
  WARN = 2,
  /** Errors that prevent normal operation or indicate a failure. */
  ERROR = 3,
}

/**
 * Current log level for the application.
 * Only messages at this level or higher (less verbose) will be output.
 * For example, if set to INFO, DEBUG messages will be suppressed.
 * This could be dynamically configured (e.g., via environment variables or application settings).
 */
const CURRENT_LOG_LEVEL: LogLevel = LogLevel.DEBUG; // Set to LogLevel.INFO for production builds

/**
 * Generates a standardized ISO timestamp string.
 * @returns Current timestamp in ISO format.
 */
const getTimestamp = (): string => new Date().toISOString();

/**
 * Formats a log message with timestamp, level, module name, and optional data.
 * @param level - The log level string (e.g., "DEBUG", "INFO").
 * @param module - The name of the module or component logging the message.
 * @param message - The main log message content.
 * @param data - Optional additional data to include in the log. Can be any type.
 *               If an object or array, it will be JSON.stringified.
 * @returns A formatted log string.
 */
const formatMessage = (level: string, module: string, message: string, data?: any): string => {
  let logMessage = `${getTimestamp()} [${level}] [${module}] ${message}`;
  if (data !== undefined) {
    if (typeof data === 'object' && data !== null) {
      try {
        // Pretty print objects for better readability in logs
        logMessage += ` | Data: ${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        // Handle circular references or other stringification errors
        logMessage += ` | Data: (Error serializing data: ${(e as Error).message})`;
      }
    } else {
      logMessage += ` | Data: ${data}`;
    }
  }
  return logMessage;
};

/**
 * Logger class providing methods for different log levels.
 * Instances are typically created per module or major component.
 */
class Logger {
  private readonly module: string;

  /**
   * Creates a new Logger instance.
   * @param moduleName - The name of the module this logger instance will be used for.
   *                     This name will be included in all log messages from this instance.
   */
  constructor(moduleName: string) {
    this.module = moduleName;
  }

  /**
   * Logs a debug message if the current log level allows for it.
   * Includes the module name, timestamp, and optional data.
   * @param message - The debug message.
   * @param data - Optional data to accompany the message.
   */
  public debug(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      console.debug(formatMessage('DEBUG', this.module, message, data));
    }
  }

  /**
   * Logs an informational message if the current log level allows for it.
   * Includes the module name, timestamp, and optional data.
   * @param message - The informational message.
   * @param data - Optional data to accompany the message.
   */
  public info(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      console.info(formatMessage('INFO', this.module, message, data));
    }
  }

  /**
   * Logs a warning message if the current log level allows for it.
   * Includes the module name, timestamp, and optional data.
   * @param message - The warning message.
   * @param data - Optional data to accompany the message.
   */
  public warn(message: string, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(formatMessage('WARN', this.module, message, data));
    }
  }

  /**
   * Logs an error message if the current log level allows for it.
   * Includes the module name, timestamp, details from an Error object (if provided), and optional data.
   * @param message - The error message.
   * @param error - Optional Error object or other error information.
   * @param data - Optional additional data.
   */
  public error(message: string, error?: any, data?: any): void {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      let detailedMessage = message;
      if (error) {
        if (error instanceof Error) {
          detailedMessage += ` | Error: ${error.message}${error.stack ? `\nStack: ${error.stack}` : ''}`;
        } else if (typeof error === 'object' && error !== null) {
          try {
            detailedMessage += ` | ErrorDetails: ${JSON.stringify(error, null, 2)}`;
          } catch (e) {
            detailedMessage += ` | ErrorDetails: (Error serializing error object)`;
          }
        } else {
          detailedMessage += ` | Error: ${error}`;
        }
      }
      // Pass the original `data` separately to formatMessage if it exists and is distinct from the error object
      console.error(formatMessage('ERROR', this.module, detailedMessage, data));
    }
  }
}

/**
 * Factory function to create Logger instances.
 * This is the preferred way to get a logger for a specific module.
 * @param moduleName - The name of the module (e.g., 'SaveGameService', 'MapRenderer').
 * @returns A new Logger instance configured for the given module name.
 */
export const createLogger = (moduleName: string): Logger => {
  return new Logger(moduleName);
};

/**
 * A default logger instance for general application-level logging or for use
 * in places where a module-specific logger is not readily available.
 * It's generally better to use `createLogger` for more specific context.
 */
const defaultLogger = createLogger('APP');
export default defaultLogger;
```
