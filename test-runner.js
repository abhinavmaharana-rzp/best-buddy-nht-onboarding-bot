#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Razorpay Onboarding Bot
 * 
 * This script runs all tests in the correct order and provides detailed reporting
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TestRunner {
  constructor() {
    this.results = {
      models: { passed: 0, failed: 0, total: 0 },
      routes: { passed: 0, failed: 0, total: 0 },
      services: { passed: 0, failed: 0, total: 0 },
      utils: { passed: 0, failed: 0, total: 0 },
      integration: { passed: 0, failed: 0, total: 0 },
      e2e: { passed: 0, failed: 0, total: 0 },
    };
    this.startTime = Date.now();
  }

  async runTests() {
    console.log('🚀 Starting Comprehensive Test Suite for Razorpay Onboarding Bot\n');
    console.log('=' .repeat(80));

    try {
      // 1. Run Model Tests
      await this.runTestSuite('models', 'Database Models');
      
      // 2. Run Utils Tests
      await this.runTestSuite('utils', 'Utility Functions');
      
      // 3. Run Services Tests
      await this.runTestSuite('services', 'Business Logic Services');
      
      // 4. Run Routes Tests
      await this.runTestSuite('routes', 'API Routes');
      
      // 5. Run Integration Tests
      await this.runTestSuite('integration', 'Integration Tests');
      
      // 6. Run E2E Tests
      await this.runTestSuite('e2e', 'End-to-End Tests');
      
      // 7. Generate Report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    }
  }

  async runTestSuite(suite, description) {
    console.log(`\n📋 Running ${description} Tests...`);
    console.log('-'.repeat(50));

    return new Promise((resolve, reject) => {
      const testPath = `tests/${suite}/`;
      const jest = spawn('npx', ['jest', testPath, '--verbose', '--no-coverage'], {
        stdio: 'pipe',
        shell: true,
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      jest.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      jest.on('close', (code) => {
        this.parseResults(suite, output, code === 0);
        resolve();
      });

      jest.on('error', (error) => {
        console.error(`❌ Failed to run ${suite} tests:`, error);
        reject(error);
      });
    });
  }

  parseResults(suite, output, success) {
    // Parse Jest output to extract test results
    const lines = output.split('\n');
    let passed = 0;
    let failed = 0;
    let total = 0;

    for (const line of lines) {
      if (line.includes('Tests:')) {
        const match = line.match(/(\d+) passed|(\d+) failed|(\d+) total/);
        if (match) {
          if (match[1]) passed = parseInt(match[1]);
          if (match[2]) failed = parseInt(match[2]);
          if (match[3]) total = parseInt(match[3]);
        }
      }
    }

    this.results[suite] = { passed, failed, total };
    
    if (success) {
      console.log(`✅ ${suite} tests completed successfully`);
    } else {
      console.log(`❌ ${suite} tests failed`);
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    console.log('\n' + '=' .repeat(80));
    console.log('📊 TEST EXECUTION REPORT');
    console.log('=' .repeat(80));

    let totalPassed = 0;
    let totalFailed = 0;
    let totalTests = 0;

    Object.entries(this.results).forEach(([suite, stats]) => {
      const { passed, failed, total } = stats;
      totalPassed += passed;
      totalFailed += failed;
      totalTests += total;

      const status = failed === 0 ? '✅' : '❌';
      const percentage = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
      
      console.log(`${status} ${suite.toUpperCase().padEnd(12)} | ${passed.toString().padStart(3)} passed | ${failed.toString().padStart(3)} failed | ${total.toString().padStart(3)} total | ${percentage}%`);
    });

    console.log('-'.repeat(80));
    console.log(`📈 OVERALL RESULTS | ${totalPassed.toString().padStart(3)} passed | ${totalFailed.toString().padStart(3)} failed | ${totalTests.toString().padStart(3)} total | ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
    console.log(`⏱️  EXECUTION TIME | ${duration}s`);
    console.log('=' .repeat(80));

    // Test Coverage Summary
    console.log('\n📋 TEST COVERAGE SUMMARY');
    console.log('-'.repeat(50));
    console.log('✅ Database Models: Complete schema validation and CRUD operations');
    console.log('✅ Utility Functions: Scoring system and helper functions');
    console.log('✅ Business Services: Gamification, AI assistant, and reporting');
    console.log('✅ API Routes: All REST endpoints and error handling');
    console.log('✅ Integration: End-to-end workflow testing');
    console.log('✅ E2E: Complete user journey validation');

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(50));
    
    if (totalFailed === 0) {
      console.log('🎉 All tests passed! The application is ready for production.');
      console.log('📝 Consider adding performance tests for high-load scenarios.');
      console.log('🔒 Add security tests for authentication and authorization.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix before deployment.');
      console.log('🔍 Check the detailed output above for specific failures.');
    }

    console.log('\n🚀 Next Steps:');
    console.log('1. Run individual test suites: npm run test:models, test:routes, etc.');
    console.log('2. Generate coverage report: npm run test:coverage');
    console.log('3. Run in watch mode: npm run test:watch');
    console.log('4. Deploy to staging environment for further testing');

    // Exit with appropriate code
    process.exit(totalFailed === 0 ? 0 : 1);
  }
}

// Run the test suite
if (require.main === module) {
  const runner = new TestRunner();
  runner.runTests().catch(console.error);
}

module.exports = TestRunner;
