/**
 * Bun Test Setup File
 * Preloaded before running tests.
 *
 * This file provides Jest compatibility for tests using jest.fn(), jest.Mock, etc.
 * Bun's mock() function from bun:test already supports all Jest chainable methods:
 * - mockReturnValue, mockReturnValueOnce
 * - mockResolvedValue, mockResolvedValueOnce
 * - mockRejectedValue, mockRejectedValueOnce
 * - mockImplementation, mockImplementationOnce
 * - mockClear, mockReset, mockRestore
 *
 * IMPORTANT: Bun does not emit TypeScript decorator metadata (emitDecoratorMetadata).
 * NestJS relies on this metadata for constructor-based dependency injection.
 * Tests that use NestJS Testing module with services that have constructor
 * dependencies may fail unless:
 * 1. The service uses explicit @Inject() decorators, OR
 * 2. Dependencies are passed directly via useFactory
 */

// Import reflect-metadata for TypeORM decorator support
import 'reflect-metadata';

// Import Bun's built-in mock utilities which are Jest-compatible
import { mock, spyOn } from 'bun:test';

// Set test environment
process.env['NODE_ENV'] = 'test';

// Create Jest-compatible global object
// Bun's mock() function already returns mocks with full Jest API compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = {
  // jest.fn() - Create a mock function with optional implementation
  fn: <T extends (...args: unknown[]) => unknown>(implementation?: T) => {
    return mock(implementation ?? (() => undefined));
  },

  // jest.spyOn() - Spy on object methods
  spyOn: spyOn,

  // jest.clearAllMocks() - Clear mock call history (Bun handles per-test)
  clearAllMocks: () => {
    // Bun automatically clears mocks between tests
  },

  // jest.resetAllMocks() - Reset mock implementations (Bun handles per-test)
  resetAllMocks: () => {
    // Bun automatically resets mocks between tests
  },

  // jest.restoreAllMocks() - Restore original implementations
  restoreAllMocks: () => {
    // Bun automatically restores mocks between tests
  },

  // jest.mock() - Module mocking (limited support in Bun)
  mock: (modulePath: string) => {
    // Bun uses mock.module() for module mocking
    // This is a no-op shim for compatibility
    console.warn(
      `jest.mock('${modulePath}') called - for Bun, use mock.module() or manual mocking`
    );
  },

  // jest.useFakeTimers() - Fake timer support
  useFakeTimers: () => {
    // Bun has built-in fake timer support via Bun.mock.timers
    console.warn('jest.useFakeTimers() called - use Bun timer mocking instead');
  },

  // jest.useRealTimers() - Restore real timers
  useRealTimers: () => {
    console.warn('jest.useRealTimers() called - use Bun timer mocking instead');
  },
};

/**
 * Helper to register design:paramtypes metadata for a class.
 * Use this when testing NestJS services that don't have explicit @Inject() decorators.
 *
 * @example
 * // In your test file:
 * import { registerParamTypes } from '../../../test/bun-setup';
 * import { DataSource, Repository } from 'typeorm';
 *
 * registerParamTypes(MyService, [Repository, Repository, DataSource]);
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export function registerParamTypes(target: Function, types: Function[]): void {
  Reflect.defineMetadata('design:paramtypes', types, target);
}
