/**
 * Jest Global Teardown for Integration Tests
 *
 * Runs once after all tests complete.
 */

export default async function globalTeardown() {
  console.log('\n🧹 Integration Test Cleanup');
  console.log('===========================');
  console.log('✅ Tests completed');
  console.log('===========================\n');
}
