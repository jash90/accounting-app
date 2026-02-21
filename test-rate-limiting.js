const axios = require('axios');

const API_URL = process.env.TEST_API_URL || 'http://localhost:3000/api';

// Test credentials from environment variables with fallbacks for development
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'wrongpassword';

async function testRateLimiting() {
  console.log('\n🚦 Testing Rate Limiting\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Login endpoint rate limiting (5 requests per minute)
    console.log('\n1️⃣  Testing Login Rate Limiting (5 req/min)...\n');

    let successfulLoginRequests = 0;
    let throttledLoginRequests = 0;

    for (let i = 1; i <= 7; i++) {
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
        });
        successfulLoginRequests++;
        console.log(`   Request ${i}: ✅ Accepted (${response.status})`);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          throttledLoginRequests++;
          console.log(`   Request ${i}: 🚫 Throttled (429 - Too Many Requests)`);
        } else if (error.response) {
          // 401 Unauthorized is expected for wrong credentials
          successfulLoginRequests++;
          console.log(
            `   Request ${i}: ✅ Accepted (${error.response.status} - ${error.response.data?.message || error.response.statusText})`
          );
        } else {
          // Network error or no response
          console.log(`   Request ${i}: ⚠️ Network error (${error.message})`);
        }
      }
      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `\n   Summary: ${successfulLoginRequests} accepted, ${throttledLoginRequests} throttled`
    );
    console.log(`   Expected: First 5 accepted, then throttled`);

    if (throttledLoginRequests > 0) {
      console.log('   ✅ Login rate limiting is WORKING');
    } else {
      console.log('   ❌ Login rate limiting is NOT WORKING');
    }

    // Wait a bit before next test
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Test 2: Register endpoint rate limiting (3 requests per minute)
    console.log('\n2️⃣  Testing Register Rate Limiting (3 req/min)...\n');

    let successfulRegisterRequests = 0;
    let throttledRegisterRequests = 0;

    for (let i = 1; i <= 5; i++) {
      try {
        const response = await axios.post(`${API_URL}/auth/register`, {
          email: `test${i}@example.com`,
          password: 'Test123456!',
          firstName: 'Test',
          lastName: 'User',
          role: 'EMPLOYEE',
        });
        successfulRegisterRequests++;
        console.log(`   Request ${i}: ✅ Accepted (${response.status})`);
      } catch (error) {
        if (error.response && error.response.status === 429) {
          throttledRegisterRequests++;
          console.log(`   Request ${i}: 🚫 Throttled (429 - Too Many Requests)`);
        } else if (error.response) {
          // Other errors (400, 409) count as accepted (not throttled)
          successfulRegisterRequests++;
          console.log(
            `   Request ${i}: ✅ Accepted (${error.response.status} - ${error.response.data?.message || error.response.statusText})`
          );
        } else {
          // Network error or no response
          console.log(`   Request ${i}: ⚠️ Network error (${error.message})`);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(
      `\n   Summary: ${successfulRegisterRequests} accepted, ${throttledRegisterRequests} throttled`
    );
    console.log(`   Expected: First 3 accepted, then throttled`);

    if (throttledRegisterRequests > 0) {
      console.log('   ✅ Register rate limiting is WORKING');
    } else {
      console.log('   ❌ Register rate limiting is NOT WORKING');
    }

    // Test 3: Global rate limiting (100 requests per minute)
    console.log('\n3️⃣  Testing Global Rate Limiting (100 req/min)...\n');
    console.log('   Note: Testing with 10 requests (below the limit)');

    let successfulGlobalRequests = 0;
    let throttledGlobalRequests = 0;

    for (let i = 1; i <= 10; i++) {
      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: 'invalid-token',
        });
        successfulGlobalRequests++;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          throttledGlobalRequests++;
        } else {
          // 401 Unauthorized is expected for invalid token
          successfulGlobalRequests++;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    console.log(
      `   Summary: ${successfulGlobalRequests} accepted, ${throttledGlobalRequests} throttled`
    );
    console.log(`   Expected: All accepted (below 100 req/min limit)`);

    if (throttledGlobalRequests === 0) {
      console.log('   ✅ Global rate limiting allows normal traffic');
    } else {
      console.log('   ⚠️  Global rate limiting too strict (unexpected throttling)');
    }

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Rate Limiting Test Summary:');
    console.log('='.repeat(60));

    const loginWorks = throttledLoginRequests > 0;
    const registerWorks = throttledRegisterRequests > 0;
    const globalWorks = throttledGlobalRequests === 0;

    if (loginWorks && registerWorks && globalWorks) {
      console.log('\n✅ ALL RATE LIMITING TESTS PASSED!');
      console.log('   ✓ Login endpoint limited to 5 requests/minute');
      console.log('   ✓ Register endpoint limited to 3 requests/minute');
      console.log('   ✓ Global limit (100 req/min) allows normal traffic');
      console.log('   ✓ Rate limiting provides brute force protection');
      console.log('   ✓ Rate limiting provides spam prevention');
    } else {
      console.log('\n⚠️  SOME TESTS DID NOT WORK AS EXPECTED');
      if (!loginWorks) console.log('   ✗ Login rate limiting not working');
      if (!registerWorks) console.log('   ✗ Register rate limiting not working');
      if (!globalWorks) console.log('   ✗ Global rate limiting too strict');
    }

    console.log('\n💡 Rate Limiting Configuration:');
    console.log('   • Global: 100 requests per minute (all endpoints)');
    console.log('   • Login: 5 requests per minute (brute force protection)');
    console.log('   • Register: 3 requests per minute (spam prevention)');
    console.log('   • Throttled requests return HTTP 429 status code');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error(`   ${error.message}`);
    console.log('\n');
    process.exit(1);
  }
}

testRateLimiting();
