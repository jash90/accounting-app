/**
 * Jest Global Setup for Integration Tests
 *
 * Runs once before all tests to verify database connectivity.
 */

import { Client } from 'pg';
import { TEST_DB_CONFIG } from './setup';

export default async function globalSetup() {
  console.log('\n🔧 Integration Test Setup');
  console.log('========================');

  // Verify database is accessible
  const client = new Client({
    host: TEST_DB_CONFIG.host,
    port: TEST_DB_CONFIG.port,
    user: TEST_DB_CONFIG.username,
    password: TEST_DB_CONFIG.password,
    database: TEST_DB_CONFIG.database,
  });

  try {
    console.log(
      `📡 Connecting to test database at ${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}...`
    );
    await client.connect();
    console.log('✅ Database connection successful');

    // Verify PostgreSQL version
    const result = await client.query('SELECT version()');
    console.log(`📊 PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
  } catch (error: unknown) {
    console.error('❌ Failed to connect to test database');
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.error('\n💡 Make sure the test database is running:');
    console.error('   docker-compose -f test/integration/docker-compose.yml up -d');
    process.exit(1);
  } finally {
    await client.end();
  }

  console.log('========================\n');
}
