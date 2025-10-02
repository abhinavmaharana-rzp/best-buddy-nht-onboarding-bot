#!/usr/bin/env node

/**
 * Debug Assessment 404 Error
 * 
 * This script helps debug the 404 error when accessing assessment configuration.
 * It checks the database, validates the assessment ID, and provides solutions.
 */

const mongoose = require('mongoose');
const Assessment = require('./models/assessment');
const ProctoringSession = require('./models/proctoringSession');
const assessmentData = require('./data/assessmentData');

// The problematic assessment ID from the error
const PROBLEMATIC_ASSESSMENT_ID = '68de17f634a10bdcfe6dd985';

async function debugAssessment404() {
  console.log('🔍 Debugging Assessment 404 Error\n');
  console.log(`Problematic Assessment ID: ${PROBLEMATIC_ASSESSMENT_ID}\n`);
  
  try {
    // Step 1: Connect to MongoDB
    console.log('📡 Step 1: Connecting to MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nht-slack-bot';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 2: Validate assessment ID format
    console.log('🔍 Step 2: Validating assessment ID format...');
    const isValidObjectId = mongoose.Types.ObjectId.isValid(PROBLEMATIC_ASSESSMENT_ID);
    console.log(`Assessment ID format valid: ${isValidObjectId ? '✅ Yes' : '❌ No'}`);
    
    if (!isValidObjectId) {
      console.log('❌ The assessment ID format is invalid. It should be a 24-character hex string.');
      console.log('💡 Solution: Check the URL and ensure the assessment ID is correct.\n');
      return;
    }
    
    // Step 3: Check if assessment exists in database
    console.log('🔍 Step 3: Checking if assessment exists in database...');
    const assessment = await Assessment.findById(PROBLEMATIC_ASSESSMENT_ID);
    
    if (assessment) {
      console.log('✅ Assessment found in database!');
      console.log(`   ID: ${assessment._id}`);
      console.log(`   Task Title: ${assessment.taskTitle}`);
      console.log(`   Status: ${assessment.status}`);
      console.log(`   User ID: ${assessment.userId}`);
      console.log(`   Created: ${assessment.createdAt}`);
      console.log(`   Started: ${assessment.startedAt}`);
      
      // Check if proctoring session exists
      const session = await ProctoringSession.findOne({ assessmentId: assessment._id });
      if (session) {
        console.log(`   Proctoring Session: ${session.sessionId} (${session.status})`);
      } else {
        console.log('   Proctoring Session: Not found');
      }
      
      // Check if assessment configuration exists
      const config = assessmentData.assessments[assessment.taskTitle];
      if (config) {
        console.log('✅ Assessment configuration found');
        console.log(`   Description: ${config.description}`);
        console.log(`   Time Limit: ${config.timeLimit} minutes`);
        console.log(`   Passing Score: ${config.passingScore}%`);
      } else {
        console.log('❌ Assessment configuration not found');
        console.log(`   Task Title: ${assessment.taskTitle}`);
        console.log(`   Available assessments: ${Object.keys(assessmentData.assessments).join(', ')}`);
      }
      
    } else {
      console.log('❌ Assessment not found in database');
      
      // Check database status
      console.log('\n🔍 Checking database status...');
      const totalAssessments = await Assessment.countDocuments();
      console.log(`Total assessments in database: ${totalAssessments}`);
      
      if (totalAssessments === 0) {
        console.log('⚠️ No assessments found in database. The database might be empty or not connected properly.');
      } else {
        console.log('📋 Recent assessments:');
        const recentAssessments = await Assessment.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('_id taskTitle status createdAt userId');
        
        recentAssessments.forEach((ass, index) => {
          console.log(`   ${index + 1}. ${ass._id} - ${ass.taskTitle} (${ass.status}) - ${ass.userId}`);
        });
      }
    }
    
    // Step 4: Check for similar assessment IDs
    console.log('\n🔍 Step 4: Looking for similar assessment IDs...');
    const similarAssessments = await Assessment.find({
      _id: {
        $gte: new mongoose.Types.ObjectId(PROBLEMATIC_ASSESSMENT_ID.substring(0, 8) + '00000000000000000000'),
        $lte: new mongoose.Types.ObjectId(PROBLEMATIC_ASSESSMENT_ID.substring(0, 8) + 'ffffffffffffffffffff')
      }
    }).limit(5);
    
    if (similarAssessments.length > 0) {
      console.log('Found similar assessment IDs:');
      similarAssessments.forEach((ass, index) => {
        console.log(`   ${index + 1}. ${ass._id} - ${ass.taskTitle} (${ass.status})`);
      });
    } else {
      console.log('No similar assessment IDs found');
    }
    
    // Step 5: Provide solutions
    console.log('\n💡 Step 5: Solutions');
    
    if (!assessment) {
      console.log('🔧 Solution 1: Create a new assessment');
      console.log('   Use the /api/assessment/start endpoint to create a new assessment');
      console.log('   Example:');
      console.log('   curl -X POST http://localhost:3000/api/assessment/start \\');
      console.log('     -H "Content-Type: application/json" \\');
      console.log('     -d \'{"userId":"test_user","taskTitle":"Fintech 101","weekIndex":0,"dayIndex":0,"taskIndex":0}\'');
      
      console.log('\n🔧 Solution 2: Check if the assessment was deleted');
      console.log('   The assessment might have been cleaned up due to timeout or manual deletion');
      console.log('   Check the application logs for cleanup messages');
      
      console.log('\n🔧 Solution 3: Verify the URL');
      console.log('   Make sure the assessment ID in the URL is correct');
      console.log('   Check if there are any typos or encoding issues');
    } else {
      console.log('🔧 Solution: The assessment exists, check the configuration');
      console.log('   The issue might be with the assessment configuration lookup');
      console.log('   Check if the task title matches the configuration keys');
    }
    
    // Step 6: Test assessment creation
    console.log('\n🧪 Step 6: Testing assessment creation...');
    try {
      const testAssessment = new Assessment({
        userId: 'debug_test_user',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 0,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test-form',
        passingScore: 80,
        maxAttempts: 3,
        status: 'in_progress',
        startedAt: new Date(),
        attemptCount: 1,
        createdBy: 'debug_script',
      });
      
      await testAssessment.save();
      console.log(`✅ Test assessment created: ${testAssessment._id}`);
      
      // Test the config endpoint
      const configResponse = await testConfigEndpoint(testAssessment._id);
      console.log('✅ Config endpoint test:', configResponse.status === 200 ? 'PASSED' : 'FAILED');
      
      // Clean up test assessment
      await Assessment.findByIdAndDelete(testAssessment._id);
      console.log('🧹 Test assessment cleaned up');
      
    } catch (error) {
      console.log('❌ Test assessment creation failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Database Connection Error:');
      console.log('   MongoDB is not running or not accessible');
      console.log('   Start MongoDB: brew services start mongodb-community (macOS)');
      console.log('   Or check your MONGODB_URI environment variable');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

async function testConfigEndpoint(assessmentId) {
  try {
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return { status: 404, error: 'Assessment not found' };
    }
    
    const config = assessmentData.assessments[assessment.taskTitle];
    if (!config) {
      return { status: 404, error: 'Assessment configuration not found' };
    }
    
    return { status: 200, data: { assessmentId, taskTitle: assessment.taskTitle } };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

// Run the debug script
if (require.main === module) {
  debugAssessment404().catch(console.error);
}

module.exports = { debugAssessment404, testConfigEndpoint };
