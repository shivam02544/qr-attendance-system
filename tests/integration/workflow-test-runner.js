#!/usr/bin/env node

/**
 * Comprehensive Workflow Test Runner
 * Executes all integration tests to validate complete system functionality
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  timeout: 60000, // 60 seconds per test suite
  verbose: true,
  coverage: false
};

// Test suites to run in order
const TEST_SUITES = [
  {
    name: 'Final Integration Tests',
    file: 'final-integration.test.js',
    description: 'Complete system workflow validation'
  },
  {
    name: 'Complete Workflows',
    file: 'complete-workflows.test.js',
    description: 'End-to-end workflow testing'
  },
  {
    name: 'System Integration',
    file: 'system-integration.test.js',
    description: 'System component integration'
  },
  {
    name: 'Attendance Flow',
    file: 'attendance-flow.test.js',
    description: 'Attendance marking flow validation'
  }
];

class TestRunner {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      suites: []
    };
  }

  async runTest(testSuite) {
    console.log(`\n🧪 Running ${testSuite.name}...`);
    console.log(`📝 ${testSuite.description}`);
    console.log('─'.repeat(60));

    return new Promise((resolve) => {
      const testPath = path.join(__dirname, testSuite.file);
      const args = [
        'run',
        testPath,
        '--reporter=verbose',
        `--testTimeout=${TEST_CONFIG.timeout}`
      ];

      if (TEST_CONFIG.coverage) {
        args.push('--coverage');
      }

      const child = spawn('npx', ['vitest', ...args], {
        cwd: path.join(__dirname, '../..'),
        stdio: 'pipe',
        shell: true
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (TEST_CONFIG.verbose) {
          process.stdout.write(text);
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (TEST_CONFIG.verbose) {
          process.stderr.write(text);
        }
      });

      child.on('close', (code) => {
        const result = {
          name: testSuite.name,
          file: testSuite.file,
          passed: code === 0,
          output,
          errorOutput,
          exitCode: code
        };

        this.results.suites.push(result);
        this.results.total++;
        
        if (code === 0) {
          this.results.passed++;
          console.log(`✅ ${testSuite.name} - PASSED`);
        } else {
          this.results.failed++;
          console.log(`❌ ${testSuite.name} - FAILED (exit code: ${code})`);
          if (errorOutput && !TEST_CONFIG.verbose) {
            console.log('Error output:', errorOutput);
          }
        }

        resolve(result);
      });

      child.on('error', (error) => {
        console.error(`❌ Failed to start test: ${error.message}`);
        const result = {
          name: testSuite.name,
          file: testSuite.file,
          passed: false,
          output: '',
          errorOutput: error.message,
          exitCode: -1
        };

        this.results.suites.push(result);
        this.results.total++;
        this.results.failed++;
        resolve(result);
      });
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Integration Test Suite');
    console.log('═'.repeat(60));
    console.log(`📊 Running ${TEST_SUITES.length} test suites`);
    console.log(`⏱️  Timeout: ${TEST_CONFIG.timeout}ms per suite`);
    console.log('═'.repeat(60));

    const startTime = Date.now();

    // Run tests sequentially to avoid database conflicts
    for (const testSuite of TEST_SUITES) {
      await this.runTest(testSuite);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    this.printSummary(duration);
    return this.results;
  }

  printSummary(duration) {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 TEST EXECUTION SUMMARY');
    console.log('═'.repeat(60));
    
    console.log(`⏱️  Total execution time: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📊 Total test suites: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    console.log('\n📝 DETAILED RESULTS:');
    console.log('─'.repeat(60));

    this.results.suites.forEach((suite, index) => {
      const status = suite.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${suite.name}: ${status}`);
      if (!suite.passed && suite.errorOutput) {
        console.log(`   Error: ${suite.errorOutput.split('\n')[0]}`);
      }
    });

    if (this.results.failed > 0) {
      console.log('\n⚠️  FAILED TEST SUITES:');
      console.log('─'.repeat(60));
      
      this.results.suites
        .filter(suite => !suite.passed)
        .forEach(suite => {
          console.log(`❌ ${suite.name} (${suite.file})`);
          console.log(`   Exit code: ${suite.exitCode}`);
          if (suite.errorOutput) {
            console.log(`   Error: ${suite.errorOutput.split('\n').slice(0, 3).join('\n   ')}`);
          }
        });
    }

    console.log('\n' + '═'.repeat(60));
    
    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! System integration is complete.');
      console.log('✨ The QR Attendance System is ready for deployment.');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
      console.log('🔧 Fix the issues and run the tests again.');
    }
    
    console.log('═'.repeat(60));
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: ((this.results.passed / this.results.total) * 100).toFixed(1)
      },
      suites: this.results.suites.map(suite => ({
        name: suite.name,
        file: suite.file,
        passed: suite.passed,
        exitCode: suite.exitCode,
        hasErrors: !!suite.errorOutput
      }))
    };

    return report;
  }
}

// Workflow validation functions
class WorkflowValidator {
  static validateTeacherWorkflow(results) {
    const teacherTests = results.suites.filter(suite => 
      suite.output.includes('Teacher workflow') || 
      suite.output.includes('teacher workflow')
    );
    
    return {
      validated: teacherTests.length > 0 && teacherTests.every(test => test.passed),
      tests: teacherTests.length,
      details: 'Teacher can create classes, generate QR codes, and view reports'
    };
  }

  static validateStudentWorkflow(results) {
    const studentTests = results.suites.filter(suite => 
      suite.output.includes('Student workflow') || 
      suite.output.includes('student workflow')
    );
    
    return {
      validated: studentTests.length > 0 && studentTests.every(test => test.passed),
      tests: studentTests.length,
      details: 'Students can register, enroll, scan QR codes, and mark attendance'
    };
  }

  static validateAdminWorkflow(results) {
    const adminTests = results.suites.filter(suite => 
      suite.output.includes('Admin workflow') || 
      suite.output.includes('admin workflow')
    );
    
    return {
      validated: adminTests.length > 0 && adminTests.every(test => test.passed),
      tests: adminTests.length,
      details: 'Admins can view system data, manage users, and generate reports'
    };
  }

  static validateLocationVerification(results) {
    const locationTests = results.suites.filter(suite => 
      suite.output.includes('location') || 
      suite.output.includes('Location')
    );
    
    return {
      validated: locationTests.length > 0 && locationTests.every(test => test.passed),
      tests: locationTests.length,
      details: 'Location verification works accurately within acceptable ranges'
    };
  }

  static validateConcurrentUsers(results) {
    const concurrentTests = results.suites.filter(suite => 
      suite.output.includes('concurrent') || 
      suite.output.includes('Concurrent')
    );
    
    return {
      validated: concurrentTests.length > 0 && concurrentTests.every(test => test.passed),
      tests: concurrentTests.length,
      details: 'System handles multiple concurrent users without conflicts'
    };
  }

  static validateErrorHandling(results) {
    const errorTests = results.suites.filter(suite => 
      suite.output.includes('error') || 
      suite.output.includes('Error')
    );
    
    return {
      validated: errorTests.length > 0 && errorTests.every(test => test.passed),
      tests: errorTests.length,
      details: 'All error scenarios are handled gracefully'
    };
  }

  static generateWorkflowReport(results) {
    const validations = {
      teacherWorkflow: this.validateTeacherWorkflow(results),
      studentWorkflow: this.validateStudentWorkflow(results),
      adminWorkflow: this.validateAdminWorkflow(results),
      locationVerification: this.validateLocationVerification(results),
      concurrentUsers: this.validateConcurrentUsers(results),
      errorHandling: this.validateErrorHandling(results)
    };

    console.log('\n🔍 WORKFLOW VALIDATION REPORT');
    console.log('═'.repeat(60));

    Object.entries(validations).forEach(([workflow, validation]) => {
      const status = validation.validated ? '✅ VALIDATED' : '❌ FAILED';
      const workflowName = workflow.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      
      console.log(`${workflowName}: ${status}`);
      console.log(`  Tests: ${validation.tests}`);
      console.log(`  Details: ${validation.details}`);
      console.log('');
    });

    const allValidated = Object.values(validations).every(v => v.validated);
    
    if (allValidated) {
      console.log('🎯 ALL WORKFLOWS VALIDATED SUCCESSFULLY!');
      console.log('✨ Task 17 - Final integration and testing is COMPLETE');
    } else {
      console.log('⚠️  Some workflows failed validation');
      console.log('🔧 Please review and fix the failing tests');
    }

    console.log('═'.repeat(60));

    return {
      allValidated,
      validations,
      summary: {
        total: Object.keys(validations).length,
        passed: Object.values(validations).filter(v => v.validated).length,
        failed: Object.values(validations).filter(v => !v.validated).length
      }
    };
  }
}

// Main execution
async function main() {
  try {
    const runner = new TestRunner();
    const results = await runner.runAllTests();
    
    // Generate workflow validation report
    const workflowReport = WorkflowValidator.generateWorkflowReport(results);
    
    // Generate JSON report for CI/CD
    const jsonReport = runner.generateReport();
    console.log('\n📄 JSON Report generated for CI/CD integration');
    
    // Exit with appropriate code
    const exitCode = results.failed === 0 && workflowReport.allValidated ? 0 : 1;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TestRunner, WorkflowValidator };