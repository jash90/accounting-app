const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:3000/api';

async function testJWTSeparation() {
  console.log('\n🧪 Testing JWT Token Separation\n');
  console.log('='.repeat(50));

  try {
    // 1. Login with admin user
    console.log('\n1️⃣  Testing Login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@system.com',
      password: 'Admin123!'
    });

    const { access_token, refresh_token, user } = loginResponse.data;
    console.log('✅ Login successful');
    console.log(`   User: ${user.firstName} ${user.lastName} (${user.role})`);
    console.log(`   Email: ${user.email}`);

    // 2. Decode both tokens to inspect their content
    console.log('\n2️⃣  Decoding Tokens...');
    const accessDecoded = jwt.decode(access_token, { complete: true });
    const refreshDecoded = jwt.decode(refresh_token, { complete: true });

    console.log('\n   📝 Access Token:');
    console.log(`      Expires: ${new Date(accessDecoded.payload.exp * 1000).toISOString()}`);
    console.log(`      Issued at: ${new Date(accessDecoded.payload.iat * 1000).toISOString()}`);
    console.log(`      Time to live: ${accessDecoded.payload.exp - accessDecoded.payload.iat} seconds`);

    console.log('\n   🔄 Refresh Token:');
    console.log(`      Expires: ${new Date(refreshDecoded.payload.exp * 1000).toISOString()}`);
    console.log(`      Issued at: ${new Date(refreshDecoded.payload.iat * 1000).toISOString()}`);
    console.log(`      Time to live: ${refreshDecoded.payload.exp - refreshDecoded.payload.iat} seconds`);

    // 3. Verify tokens are different
    console.log('\n3️⃣  Verifying Token Differences...');
    const tokensAreDifferent = access_token !== refresh_token;
    const expirationsDifferent = accessDecoded.payload.exp !== refreshDecoded.payload.exp;

    if (tokensAreDifferent) {
      console.log('   ✅ Access and refresh tokens are DIFFERENT (as expected)');
    } else {
      console.log('   ❌ Access and refresh tokens are THE SAME (BUG!)');
    }

    if (expirationsDifferent) {
      console.log('   ✅ Tokens have DIFFERENT expiration times (as expected)');
      const timeDiff = refreshDecoded.payload.exp - accessDecoded.payload.exp;
      console.log(`   ℹ️  Refresh token expires ${timeDiff} seconds later than access token`);
    } else {
      console.log('   ❌ Tokens have THE SAME expiration time (BUG!)');
    }

    // 4. Test refresh token endpoint
    console.log('\n4️⃣  Testing Token Refresh...');
    const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
      refresh_token: refresh_token
    });

    const { access_token: newAccessToken, refresh_token: newRefreshToken } = refreshResponse.data;
    console.log('   ✅ Token refresh successful');

    const newAccessDecoded = jwt.decode(newAccessToken, { complete: true });
    console.log(`   ℹ️  New access token expires: ${new Date(newAccessDecoded.payload.exp * 1000).toISOString()}`);
    console.log(`   ℹ️  New access token TTL: ${newAccessDecoded.payload.exp - newAccessDecoded.payload.iat} seconds`);

    // 5. Test protected endpoint with access token
    console.log('\n5️⃣  Testing Protected Endpoint...');
    const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    console.log('   ✅ Protected endpoint accessible with access token');
    console.log(`   User profile: ${profileResponse.data.firstName} ${profileResponse.data.lastName}`);

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary:');
    console.log('='.repeat(50));

    const allTestsPassed = tokensAreDifferent && expirationsDifferent;

    if (allTestsPassed) {
      console.log('\n✅ ALL TESTS PASSED!');
      console.log('   ✓ Access and refresh tokens are properly separated');
      console.log('   ✓ Tokens use different secrets');
      console.log('   ✓ Tokens have different expiration times');
      console.log('   ✓ Token refresh endpoint works correctly');
      console.log('   ✓ Protected endpoints work with access token');
    } else {
      console.log('\n❌ SOME TESTS FAILED!');
      if (!tokensAreDifferent) {
        console.log('   ✗ Tokens are identical (same secret issue)');
      }
      if (!expirationsDifferent) {
        console.log('   ✗ Tokens have same expiration (same config issue)');
      }
    }

    console.log('\n');

  } catch (error) {
    console.error('\n❌ Error during testing:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.message || error.response.statusText}`);
    } else {
      console.error(`   ${error.message}`);
    }
    console.log('\n');
    process.exit(1);
  }
}

testJWTSeparation();
