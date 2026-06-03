enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
  ip?: string;
  duration?: number;
}

export class LoggerService {
  private level: LogLevel;
  private format: 'json' | 'text';

  constructor() {
    const envLevel = (process.env.LOG_LEVEL || 'info').toUpperCase() as keyof typeof LogLevel;
    this.level = LogLevel[envLevel] ?? LogLevel.INFO;
    this.format = (process.env.LOG_FORMAT as 'json' | 'text') || 'json';
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  trace(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (level > this.level) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      ...context,
    };

    if (this.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      console.log(`[${entry.timestamp}] ${entry.level}: ${message}${contextStr}`);
    }
  }
}

export const logger = new LoggerService();
export default logger;