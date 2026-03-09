import type { Repository } from 'typeorm';

/**
 * Creates a mock TypeORM repository with common methods pre-stubbed.
 * Pass overrides to add custom methods or replace defaults.
 */
export function createMockRepository<T = any>(
  overrides?: Record<string, jest.Mock | unknown>
): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<Repository<T>>;
}
