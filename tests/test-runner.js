#!/usr/bin/env node

/**
 * Test runner script for the QR Attendance System
 * This script runs all test suites and provides a summary
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

console.log('🧪 QR Attendance System Test Suite');
console.log('=====================================');
console.log(`Version: ${packageJson.version}`);
console.log(`Node: ${process.version}`);
console.log('');

const testSuites = [
  {
    name: 'Unit Tests - Models',
    pattern: 'tests/models/**/*.test.js',
    description: 'Testing Mongoose models and database operations'
  },
  {
    name: 'Unit Tests - Utilities',
    pattern: 'tests/lib/**/*.test.js',
    description: 'Testing utility functions and helpers'
  },
  {
    name: 'API Tests',
    pattern: 'tests/api/**/*.test.js',
    description: 'Testing API endpoints and request handling'
  },
  {
    name: 'Authentication Tests',
    pattern: 'tests/auth/**/*.test.js',
    description: 'Testing authentication and authorization'
  },
  {
    name: 'Integration Tests',
    pattern: 'tests/integration/**/*.test.js',
    description: 'Testing complete workflows and integrations'
  }
];

let totalPassed = 0;
let totalFailed = 0;
let totalSuites = 0;

console.log('Running test suites...\n');

for (const suite of testSuites) {
  console.log(`📋 ${suite.name}`);
  console.log(`   ${suite.description}`);
  
  try {
    const result = execSync(`npm test -- --run ${suite.pattern}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Parse test results (basic parsing)
    const lines = result.split('\n');
    const summaryLine = lines.find(line => line.includes('Test Files') || line.includes('Tests'));
    
    if (summaryLine) {
      console.log(`   ✅ ${summaryLine.trim()}`);
    } else {
      console.log('   ✅ Passed');
    }
    
    totalSuites++;
    
  } catch (error) {
    console.log(`   ❌ Failed`);
    console.log(`   Error: ${error.message.split('\n')[0]}`);
    totalFailed++;
  }
  
  console.log('');
}

console.log('=====================================');
console.log('📊 Test Summary');
console.log('=====================================');
console.log(`Total Test Suites: ${testSuites.length}`);
console.log(`Passed: ${totalSuites}`);
console.log(`Failed: ${totalFailed}`);

if (totalFailed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please check the output above.');
  process.exit(1);
}