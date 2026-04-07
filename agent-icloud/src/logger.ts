export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private logLevel: LogLevel;
  private levels = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(logLevel: LogLevel = 'info') {
    this.logLevel = logLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatTime(): string {
    const now = new Date();
    return now.toISOString();
  }

  private formatMessage(level: string, message: string): string {
    return `[${this.formatTime()}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message));
    }
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message));
    }
  }

  error(message: string): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message));
    }
  }
}
