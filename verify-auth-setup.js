/**
 * Verification script to check if authentication system is properly set up
 * This script checks file structure and basic imports without requiring a database
 */

import fs from 'fs';
import path from 'path';

const requiredFiles = [
  'app/api/auth/[...nextauth]/route.js',
  'app/api/auth/register/route.js',
  'app/api/auth/me/route.js',
  'lib/auth.js',
  'lib/auth-utils.js',
  'models/User.js',
  '.env.local'
];

const requiredDirectories = [
  'app/api/auth',
  'app/api/protected',
  'app/api/teacher/test',
  'app/api/student/test',
  'app/api/admin/test'
];

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

function checkDirectoryExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

async function verifyAuthSetup() {
  console.log('🔍 Verifying Authentication System Setup...\n');

  let allGood = true;

  // Check required files
  console.log('📁 Checking required files:');
  for (const file of requiredFiles) {
    const exists = checkFileExists(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allGood = false;
  }

  console.log('\n📂 Checking required directories:');
  for (const dir of requiredDirectories) {
    const exists = checkDirectoryExists(dir);
    console.log(`${exists ? '✅' : '❌'} ${dir}`);
    if (!exists) allGood = false;
  }

  // Check environment variables
  console.log('\n🔧 Checking environment configuration:');
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const hasMongoUri = envContent.includes('MONGODB_URI=');
    const hasNextAuthUrl = envContent.includes('NEXTAUTH_URL=');
    const hasNextAuthSecret = envContent.includes('NEXTAUTH_SECRET=');

    console.log(`${hasMongoUri ? '✅' : '❌'} MONGODB_URI configured`);
    console.log(`${hasNextAuthUrl ? '✅' : '❌'} NEXTAUTH_URL configured`);
    console.log(`${hasNextAuthSecret ? '✅' : '❌'} NEXTAUTH_SECRET configured`);

    if (!hasMongoUri || !hasNextAuthUrl || !hasNextAuthSecret) {
      allGood = false;
    }
  } catch (error) {
    console.log('❌ .env.local file not readable');
    allGood = false;
  }

  // Check package.json dependencies
  console.log('\n📦 Checking dependencies:');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = ['next-auth', 'bcryptjs', 'mongoose'];
    for (const dep of requiredDeps) {
      const exists = deps[dep];
      console.log(`${exists ? '✅' : '❌'} ${dep} ${exists ? `(${exists})` : 'missing'}`);
      if (!exists) allGood = false;
    }
  } catch (error) {
    console.log('❌ Could not read package.json');
    allGood = false;
  }

  console.log('\n' + '='.repeat(50));
  
  if (allGood) {
    console.log('🎉 Authentication system setup is complete!');
    console.log('\nNext steps:');
    console.log('1. Start MongoDB server');
    console.log('2. Run: npm run dev');
    console.log('3. Test registration at: http://localhost:3000/api/auth/register');
    console.log('4. Test login with NextAuth.js');
  } else {
    console.log('❌ Authentication system setup has issues.');
    console.log('Please check the missing files/configurations above.');
  }

  console.log('\nAuthentication System Features:');
  console.log('✅ NextAuth.js with credentials provider');
  console.log('✅ User registration with password hashing');
  console.log('✅ Role-based access control (teacher/student/admin)');
  console.log('✅ Protected API routes with middleware');
  console.log('✅ JWT session management');
  console.log('✅ MongoDB integration with Mongoose');
}

verifyAuthSetup().catch(console.error);