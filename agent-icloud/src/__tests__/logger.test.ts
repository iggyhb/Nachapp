import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a logger with default log level (info)', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
  });

  it('should create a logger with custom log level', () => {
    const logger = new Logger('debug');
    expect(logger).toBeDefined();
  });

  it('should not log debug messages when level is info', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = new Logger('info');

    logger.debug('debug message');

    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it('should log debug messages when level is debug', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = new Logger('debug');

    logger.debug('debug message');

    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('debug message'));
    debugSpy.mockRestore();
  });

  it('should log info messages when level is info', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger('info');

    logger.info('info message');

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('info message'));
    logSpy.mockRestore();
  });

  it('should log warn messages when level is warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new Logger('warn');

    logger.warn('warn message');

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('warn message'));
    warnSpy.mockRestore();
  });

  it('should log error messages when level is error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new Logger('error');

    logger.error('error message');

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('error message'));
    errorSpy.mockRestore();
  });

  it('should not log debug or info when level is warn', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger('warn');

    logger.debug('debug');
    logger.info('info');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();

    debugSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should format messages with ISO timestamp and level', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const logger = new Logger('info');

    logger.info('test message');

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T/));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));

    logSpy.mockRestore();
  });

  it('should respect log level hierarchy: error > warn > info > debug', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const logger = new Logger('error');

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('error'));

    debugSpy.mockRestore();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
