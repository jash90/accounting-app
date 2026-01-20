/**
 * Jest Setup for Integration Tests
 *
 * Runs before each test file.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '5433';
process.env.TEST_DB_USERNAME = process.env.TEST_DB_USERNAME || 'test_user';
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'test_password';
process.env.TEST_DB_DATABASE = process.env.TEST_DB_DATABASE || 'accounting_test';

// Increase test timeout for database operations
jest.setTimeout(30000);

// Suppress console output in tests unless TEST_VERBOSE is set
if (process.env.TEST_VERBOSE !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Keep warn and error for debugging
    warn: console.warn,
    error: console.error,
  };
}
