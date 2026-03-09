import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createLogger, type Logger } from './logger';

describe('Logger', () => {
  let logger: Logger;
  // Prefix unused spies with underscore to satisfy no-unused-vars lint rule
  let _consoleDebugSpy: ReturnType<typeof vi.spyOn>;
  let _consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let _consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logger = createLogger('TestContext');
    _consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    _consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    _consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLogger', () => {
    it('should create a logger with the given context', () => {
      const customLogger = createLogger('CustomContext');
      expect(customLogger).toBeDefined();
    });
  });

  // Note: Debug/log/warn methods only output in DEV mode (import.meta.env.DEV === true)
  // In bun test, import.meta.env.DEV is undefined (falsy), so these methods are no-ops.
  // We test these methods exist and don't throw, but can't verify output without DEV mode.
  describe('method existence and safety', () => {
    it('should have debug method that does not throw', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow();
      expect(() => logger.debug('Test debug message', { key: 'value' })).not.toThrow();
    });

    it('should have log method that does not throw', () => {
      expect(() => logger.log('Test log message')).not.toThrow();
      expect(() => logger.log('Test log message', { key: 'value' })).not.toThrow();
    });

    it('should have warn method that does not throw', () => {
      expect(() => logger.warn('Test warn message')).not.toThrow();
      expect(() => logger.warn('Test warn message', { key: 'value' })).not.toThrow();
    });
  });

  // Error logging always works (dev and production)
  describe('error logging', () => {
    it('should log error messages with context prefix', () => {
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Test error message', '', '');
    });

    it('should log error messages with error object', () => {
      const error = new Error('Something went wrong');
      logger.error('Test error message', error);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Test error message', error, '');
    });

    it('should log error messages with error object and context', () => {
      const error = new Error('Something went wrong');
      const ctx = { userId: '123' };
      logger.error('Test error message', error, ctx);

      expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Test error message', error, ctx);
    });

    it('should handle non-Error objects passed as error', () => {
      const nonError = { code: 'ERR_001', details: 'Some error details' };
      logger.error('Error with non-Error object', nonError);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestContext] Error with non-Error object',
        nonError,
        ''
      );
    });

    it('should handle null passed as error', () => {
      logger.error('Error with null', null);

      // Logger converts null/undefined to empty string via ?? operator
      expect(consoleErrorSpy).toHaveBeenCalledWith('[TestContext] Error with null', '', '');
    });

    it('should handle string passed as error', () => {
      logger.error('Error with string', 'String error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestContext] Error with string',
        'String error message',
        ''
      );
    });

    it('should handle undefined context gracefully', () => {
      logger.error('Error without context', new Error('test'), undefined);

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('special characters and edge cases', () => {
    it('should handle special characters in context name', () => {
      const specialLogger = createLogger('Context:With/Special-Chars');
      specialLogger.error('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Context:With/Special-Chars] Test error',
        '',
        ''
      );
    });

    it('should handle empty string context name', () => {
      const emptyContextLogger = createLogger('');
      emptyContextLogger.error('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[] Test error', '', '');
    });

    it('should handle complex nested context objects', () => {
      const complexCtx = {
        user: { id: '123', name: 'Test' },
        nested: { deep: { value: true } },
        array: [1, 2, 3],
      };
      logger.error('Complex context', new Error('test'), complexCtx);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[TestContext] Complex context',
        expect.any(Error),
        complexCtx
      );
    });
  });
});
