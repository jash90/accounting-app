/**
 * Integration Test Setup
 *
 * Provides utilities for setting up and tearing down integration tests
 * with a real PostgreSQL database.
 */

import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Test database configuration
export const TEST_DB_CONFIG = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5433', 10),
  username: process.env.TEST_DB_USERNAME || 'test_user',
  password: process.env.TEST_DB_PASSWORD || 'test_password',
  database: process.env.TEST_DB_DATABASE || 'accounting_test',
};

/**
 * Creates a DataSource for integration tests.
 * This connects to a real PostgreSQL database.
 */
export async function createTestDataSource(entities: any[]): Promise<DataSource> {
  const dataSource = new DataSource({
    type: 'postgres',
    ...TEST_DB_CONFIG,
    entities,
    synchronize: true, // Auto-sync schema for tests
    dropSchema: true, // Clean slate for each test run
    logging: process.env.TEST_DB_LOGGING === 'true',
  });

  await dataSource.initialize();
  return dataSource;
}

/**
 * Creates a NestJS testing module with TypeORM configured for integration tests.
 */
export async function createIntegrationTestingModule(
  imports: any[],
  providers: any[],
  entities: any[],
): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: '.env.test',
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        ...TEST_DB_CONFIG,
        entities,
        synchronize: true,
        dropSchema: true,
        logging: process.env.TEST_DB_LOGGING === 'true',
      }),
      TypeOrmModule.forFeature(entities),
      ...imports,
    ],
    providers,
  }).compile();
}

/**
 * Test data factory for creating test entities.
 */
export class TestDataFactory {
  constructor(private dataSource: DataSource) {}

  /**
   * Creates a test user in the database.
   */
  private counter = 0;

  private generateUniqueId(prefix: string): string {
    return `${prefix}-${Date.now()}-${++this.counter}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async createUser(overrides: Partial<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companyId: string;
  }> = {}) {
    const userRepo = this.dataSource.getRepository('User');
    const uniqueId = this.generateUniqueId('user');
    const user = userRepo.create({
      id: overrides.id || uniqueId,
      email: overrides.email || `test-${uniqueId}@example.com`,
      firstName: overrides.firstName || 'Test',
      lastName: overrides.lastName || 'User',
      password: 'hashed-password',
      role: overrides.role || 'EMPLOYEE',
      companyId: overrides.companyId || this.generateUniqueId('company'),
      isActive: true,
    });
    return userRepo.save(user);
  }

  /**
   * Creates a test company in the database.
   */
  async createCompany(overrides: Partial<{
    id: string;
    name: string;
    ownerId: string;
  }> = {}) {
    const companyRepo = this.dataSource.getRepository('Company');
    const company = companyRepo.create({
      id: overrides.id || this.generateUniqueId('company'),
      name: overrides.name || 'Test Company',
      ownerId: overrides.ownerId || this.generateUniqueId('owner'),
      isActive: true,
    });
    return companyRepo.save(company);
  }

  /**
   * Creates a test time entry in the database.
   */
  async createTimeEntry(overrides: Partial<{
    id: string;
    userId: string;
    companyId: string;
    description: string;
    startTime: Date;
    endTime: Date | null;
    isRunning: boolean;
  }> = {}) {
    if (!overrides.userId) {
      throw new Error('createTimeEntry requires userId to be provided');
    }
    if (!overrides.companyId) {
      throw new Error('createTimeEntry requires companyId to be provided');
    }
    const timeEntryRepo = this.dataSource.getRepository('TimeEntry');
    const entry = timeEntryRepo.create({
      id: overrides.id || this.generateUniqueId('entry'),
      userId: overrides.userId,
      companyId: overrides.companyId,
      description: overrides.description || 'Test entry',
      startTime: overrides.startTime || new Date(),
      endTime: overrides.endTime,
      isRunning: overrides.isRunning ?? false,
    });
    return timeEntryRepo.save(entry);
  }

  /**
   * Cleans up all test data from the database.
   */
  async cleanup() {
    const entities = this.dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = this.dataSource.getRepository(entity.name);
      await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE`);
    }
  }
}

/**
 * Utility to run multiple promises concurrently and return results.
 */
export async function runConcurrently<T>(
  operations: (() => Promise<T>)[],
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(operations.map(op => op()));
}

/**
 * Waits for a condition to be true.
 */
export async function waitFor(
  condition: () => Promise<boolean> | boolean,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}
