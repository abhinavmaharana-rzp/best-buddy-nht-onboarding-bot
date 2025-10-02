#!/usr/bin/env node

/**
 * Test Config Fix
 * 
 * This script tests the assessment config endpoint fix by creating
 * an assessment and testing the config endpoint directly.
 */

const mongoose = require('mongoose');
const Assessment = require('./models/assessment');
const assessmentData = require('./data/assessmentData');

async function testConfigFix() {
  try {
    console.log('🧪 Testing Assessment Config Fix\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/nht-slack-bot');
    console.log('✅ Connected to MongoDB');
    
    // Create a test assessment
    const assessment = new Assessment({
      userId: 'test_user_config_fix',
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
      createdBy: 'test_script',
    });
    
    await assessment.save();
    console.log('✅ Test assessment created:', assessment._id);
    
    // Test the config endpoint logic directly
    console.log('\n🔍 Testing config endpoint logic...');
    
    // Simulate the config endpoint logic
    const assessmentId = assessment._id.toString();
    console.log('Assessment ID:', assessmentId);
    
    // Validate assessment ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      console.log('❌ Invalid assessment ID format');
      return;
    }
    console.log('✅ Assessment ID format valid');
    
    // Find the assessment in the database
    const foundAssessment = await Assessment.findById(assessmentId);
    if (!foundAssessment) {
      console.log('❌ Assessment not found in database');
      return;
    }
    console.log('✅ Assessment found in database');
    
    // Get assessment configuration from static data
    const config = assessmentData.assessments[foundAssessment.taskTitle];
    if (!config) {
      console.log('❌ Assessment configuration not found');
      return;
    }
    console.log('✅ Assessment configuration found');
    
    // Generate response
    const response = {
      assessmentId: foundAssessment._id,
      taskTitle: foundAssessment.taskTitle,
      description: config.description,
      googleFormUrl: config.googleFormUrl,
      passingScore: config.passingScore,
      timeLimit: config.timeLimit,
      maxAttempts: config.maxAttempts,
      proctoringEnabled: config.proctoringEnabled,
      weekIndex: foundAssessment.weekIndex,
      dayIndex: foundAssessment.dayIndex,
      taskIndex: foundAssessment.taskIndex,
    };
    
    console.log('✅ Config response generated successfully');
    console.log('\n📋 Config Response:');
    console.log(JSON.stringify(response, null, 2));
    
    // Generate assessment URL
    const assessmentUrl = `http://localhost:3000/assessment.html?assessmentId=${assessmentId}&sessionId=test_session_123`;
    console.log('\n🔗 Assessment URL:');
    console.log(assessmentUrl);
    
    // Test the actual API endpoint
    console.log('\n🌐 Testing actual API endpoint...');
    const fetch = require('node-fetch');
    
    try {
      const apiResponse = await fetch(`http://localhost:3000/api/assessment/config/${assessmentId}`);
      const apiData = await apiResponse.json();
      
      if (apiResponse.ok) {
        console.log('✅ API endpoint working correctly');
        console.log('API Response:', JSON.stringify(apiData, null, 2));
      } else {
        console.log('❌ API endpoint failed');
        console.log('Status:', apiResponse.status);
        console.log('Response:', apiData);
      }
    } catch (apiError) {
      console.log('❌ API request failed:', apiError.message);
    }
    
    // Clean up
    await Assessment.findByIdAndDelete(assessment._id);
    console.log('\n🧹 Test assessment cleaned up');
    
    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
if (require.main === module) {
  testConfigFix().catch(console.error);
}

module.exports = { testConfigFix };
