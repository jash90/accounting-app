/**
 * Bun Test Setup File
 * Preloaded before running tests.
 */

// Import reflect-metadata for TypeORM decorator support
import 'reflect-metadata';

// Set test environment
process.env['NODE_ENV'] = 'test';
