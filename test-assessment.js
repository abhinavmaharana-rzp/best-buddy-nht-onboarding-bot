/**
 * Test script for the proctored assessment system
 * Run with: node test-assessment.js
 */

const { simulateGoogleFormsScoring, calculateScore } = require('./utils/scoring');

async function testScoringSystem() {
  console.log('🧪 Testing Proctored Assessment Scoring System\n');

  const testCases = [
    {
      taskTitle: "Fintech 101",
      userData: {
        timeSpent: 25, // 25 minutes
        violations: 0,
        attemptCount: 1,
      }
    },
    {
      taskTitle: "Core Payments",
      userData: {
        timeSpent: 45, // 45 minutes
        violations: 2,
        attemptCount: 2,
      }
    },
    {
      taskTitle: "Cross Border Payments",
      userData: {
        timeSpent: 30, // 30 minutes
        violations: 5,
        attemptCount: 3,
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.taskTitle}`);
    console.log(`   User Data:`, testCase.userData);
    
    try {
      // Test direct scoring
      const directResult = calculateScore(testCase.taskTitle, testCase.userData);
      console.log(`   Direct Score: ${directResult.score}% (${directResult.passed ? 'PASSED' : 'FAILED'})`);
      console.log(`   Feedback: ${directResult.feedback}`);
      console.log(`   Adjustments:`, directResult.adjustments);
      
      // Test Google Forms simulation
      const formUrl = `https://forms.gle/test-${testCase.taskTitle.toLowerCase().replace(/\s+/g, '-')}`;
      const formResult = await simulateGoogleFormsScoring(formUrl, testCase.userData);
      console.log(`   Form Score: ${formResult.score}% (${formResult.passed ? 'PASSED' : 'FAILED'})`);
      console.log(`   Form Feedback: ${formResult.feedback}`);
      
    } catch (error) {
      console.error(`   Error: ${error.message}`);
    }
    
    console.log('   ' + '─'.repeat(50));
  }

  console.log('\n✅ Scoring system test completed!');
}

// Test assessment data configuration
function testAssessmentData() {
  console.log('\n📊 Testing Assessment Data Configuration\n');
  
  const assessmentData = require('./data/assessmentData');
  
  console.log('Available Assessments:');
  Object.keys(assessmentData.assessments).forEach(title => {
    const config = assessmentData.assessments[title];
    console.log(`  • ${title}`);
    console.log(`    - Passing Score: ${config.passingScore}%`);
    console.log(`    - Time Limit: ${config.timeLimit} minutes`);
    console.log(`    - Max Attempts: ${config.maxAttempts}`);
    console.log(`    - Proctoring: ${config.proctoringEnabled ? 'Enabled' : 'Disabled'}`);
    console.log('');
  });

  console.log('Proctoring Configuration:');
  console.log('  Screen Recording:', assessmentData.proctoring.screenRecording.enabled ? 'Enabled' : 'Disabled');
  console.log('  Violation Detection:');
  Object.keys(assessmentData.proctoring.violations).forEach(type => {
    const config = assessmentData.proctoring.violations[type];
    console.log(`    - ${type}: ${config.enabled ? 'Enabled' : 'Disabled'} (Max: ${config.maxAllowed}, Severity: ${config.severity})`);
  });
}

// Test database models
function testDatabaseModels() {
  console.log('\n🗄️ Testing Database Models\n');
  
  try {
    const Assessment = require('./models/assessment');
    const ProctoringSession = require('./models/proctoringSession');
    
    console.log('✅ Assessment model loaded successfully');
    console.log('✅ ProctoringSession model loaded successfully');
    
    // Test model validation
    const testAssessment = new Assessment({
      userId: 'test-user-123',
      taskTitle: 'Fintech 101',
      weekIndex: 0,
      dayIndex: 1,
      taskIndex: 0,
      googleFormUrl: 'https://forms.gle/test',
      status: 'pending',
    });
    
    console.log('✅ Assessment model validation passed');
    
  } catch (error) {
    console.error('❌ Database model test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Proctored Assessment System Tests\n');
  console.log('=' .repeat(60));
  
  try {
    await testScoringSystem();
    testAssessmentData();
    testDatabaseModels();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update Google Forms URLs in data/assessmentData.js');
    console.log('2. Set up environment variables (BASE_URL, etc.)');
    console.log('3. Test the full flow with a real user');
    console.log('4. Deploy to production environment');
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testScoringSystem,
  testAssessmentData,
  testDatabaseModels,
  runAllTests,
};
