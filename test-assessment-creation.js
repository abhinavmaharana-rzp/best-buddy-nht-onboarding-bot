/**
 * Test Assessment Creation Script
 * 
 * This script tests the assessment creation flow and helps debug
 * the 404 error when accessing assessment configuration.
 */

const mongoose = require('mongoose');
const Assessment = require('./models/assessment');
const ProctoringSession = require('./models/proctoringSession');
const assessmentData = require('./data/assessmentData');

async function testAssessmentCreation() {
  try {
    console.log('🔍 Testing Assessment Creation Flow...\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nht-slack-bot';
    console.log('📡 Connecting to MongoDB:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Test data
    const testUserId = 'test_user_123';
    const testTaskTitle = 'Fintech 101';
    const testWeekIndex = 0;
    const testDayIndex = 0;
    const testTaskIndex = 0;
    
    console.log('📋 Test Parameters:');
    console.log(`  User ID: ${testUserId}`);
    console.log(`  Task Title: ${testTaskTitle}`);
    console.log(`  Week/Day/Task: ${testWeekIndex}/${testDayIndex}/${testTaskIndex}\n`);
    
    // Check if assessment configuration exists
    const config = assessmentData.assessments[testTaskTitle];
    if (!config) {
      console.error('❌ Assessment configuration not found for task:', testTaskTitle);
      console.log('📋 Available assessments:', Object.keys(assessmentData.assessments));
      return;
    }
    console.log('✅ Found assessment config:', config.title || testTaskTitle);
    
    // Check for existing assessment
    const existingAssessment = await Assessment.findOne({
      userId: testUserId,
      weekIndex: testWeekIndex,
      dayIndex: testDayIndex,
      taskIndex: testTaskIndex,
    });
    
    if (existingAssessment) {
      console.log('🔄 Found existing assessment:', existingAssessment._id);
      console.log('   Status:', existingAssessment.status);
      console.log('   Attempt Count:', existingAssessment.attemptCount);
      
      // Test the config endpoint
      console.log('\n🧪 Testing config endpoint...');
      const configResponse = await testConfigEndpoint(existingAssessment._id);
      console.log('Config response:', configResponse);
      
    } else {
      console.log('📝 Creating new assessment...');
      
      // Create assessment
      const assessment = new Assessment({
        userId: testUserId,
        taskTitle: testTaskTitle,
        weekIndex: testWeekIndex,
        dayIndex: testDayIndex,
        taskIndex: testTaskIndex,
        googleFormUrl: config.googleFormUrl || 'https://forms.gle/test-form',
        passingScore: config.passingScore,
        maxAttempts: config.maxAttempts,
        status: 'in_progress',
        startedAt: new Date(),
        attemptCount: 1,
        createdBy: 'test_script',
      });
      
      await assessment.save();
      console.log('✅ Assessment created:', assessment._id);
      
      // Create proctoring session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const proctoringSession = new ProctoringSession({
        sessionId,
        userId: testUserId,
        assessmentId: assessment._id,
        status: 'active',
        startTime: new Date(),
        environment: {
          userAgent: 'Test Script',
          screenResolution: '1920x1080',
          browser: 'Test Browser',
          os: 'Test OS',
        },
        metadata: {
          ipAddress: '127.0.0.1',
          location: 'Test Location',
          timezone: 'UTC',
        },
      });
      
      await proctoringSession.save();
      console.log('✅ Proctoring session created:', sessionId);
      
      // Test the config endpoint
      console.log('\n🧪 Testing config endpoint...');
      const configResponse = await testConfigEndpoint(assessment._id);
      console.log('Config response:', configResponse);
      
      // Generate assessment URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const assessmentUrl = `${baseUrl}/assessment.html?assessmentId=${assessment._id}&sessionId=${sessionId}`;
      console.log('\n🔗 Assessment URL:', assessmentUrl);
    }
    
    // Show all assessments
    console.log('\n📊 All assessments in database:');
    const allAssessments = await Assessment.find().sort({ createdAt: -1 }).limit(10);
    allAssessments.forEach(assessment => {
      console.log(`  ${assessment._id} - ${assessment.taskTitle} - ${assessment.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

async function testConfigEndpoint(assessmentId) {
  try {
    // Simulate the config endpoint logic
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return { error: 'Assessment not found', status: 404 };
    }
    
    const config = assessmentData.assessments[assessment.taskTitle];
    if (!config) {
      return { error: 'Assessment configuration not found', status: 404 };
    }
    
    return {
      status: 200,
      data: {
        assessmentId: assessment._id,
        taskTitle: assessment.taskTitle,
        description: config.description,
        googleFormUrl: config.googleFormUrl,
        passingScore: config.passingScore,
        timeLimit: config.timeLimit,
        maxAttempts: config.maxAttempts,
        proctoringEnabled: config.proctoringEnabled,
        weekIndex: assessment.weekIndex,
        dayIndex: assessment.dayIndex,
        taskIndex: assessment.taskIndex,
      }
    };
  } catch (error) {
    return { error: error.message, status: 500 };
  }
}

// Run the test
if (require.main === module) {
  testAssessmentCreation();
}

module.exports = { testAssessmentCreation, testConfigEndpoint };
