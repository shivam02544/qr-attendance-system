/**
 * Simple test script to verify authentication system
 * Run with: node test-auth.js
 */

const BASE_URL = 'http://localhost:3000';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  try {
    // Test 1: Register a new user
    console.log('1. Testing user registration...');
    const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        role: 'teacher'
      })
    });

    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✅ Registration successful:', registerData.message);
    } else {
      const error = await registerResponse.json();
      console.log('❌ Registration failed:', error.error);
    }

    // Test 2: Try to register duplicate user
    console.log('\n2. Testing duplicate registration...');
    const duplicateResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User 2',
        role: 'student'
      })
    });

    if (!duplicateResponse.ok) {
      const error = await duplicateResponse.json();
      console.log('✅ Duplicate prevention working:', error.error);
    } else {
      console.log('❌ Duplicate prevention failed');
    }

    // Test 3: Test validation
    console.log('\n3. Testing validation...');
    const validationResponse = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid-email',
        password: '123', // Too short
        name: '',
        role: 'invalid-role'
      })
    });

    if (!validationResponse.ok) {
      const error = await validationResponse.json();
      console.log('✅ Validation working:', error.error);
    } else {
      console.log('❌ Validation failed');
    }

    console.log('\n🎉 Authentication system tests completed!');
    console.log('\nTo test login functionality:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Try logging in with: test@example.com / password123');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure the development server is running: npm run dev');
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  testAuth();
}

module.exports = { testAuth };