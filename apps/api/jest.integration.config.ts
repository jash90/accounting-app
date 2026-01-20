/**
 * Jest Integration Test Configuration
 *
 * This configuration is used for running integration tests that require
 * a real PostgreSQL database. Separate from unit tests for isolation.
 *
 * Usage:
 *   npm run test:integration
 *
 * Prerequisites:
 *   1. Start test database: docker-compose -f test/integration/docker-compose.yml up -d
 *   2. Wait for database to be ready
 *   3. Run tests
 */

export default {
  displayName: 'api-integration',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api-integration',

  // Only run integration test files
  testMatch: ['**/*.integration.spec.ts'],

  // Longer timeout for database operations
  testTimeout: 30000,

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Setup and teardown
  globalSetup: '<rootDir>/../../test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/../../test/integration/global-teardown.ts',

  // Module path mapping
  moduleNameMapper: {
    '^@accounting/(.*)$': '<rootDir>/../../libs/$1/src',
  },

  // Environment variables for test database
  setupFilesAfterEnv: ['<rootDir>/../../test/integration/jest.setup.ts'],
};
