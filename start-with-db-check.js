#!/usr/bin/env node

/**
 * Start Application with Database Check
 * 
 * This script checks if MongoDB is available before starting the application.
 * If MongoDB is not available, it provides helpful instructions.
 */

const mongoose = require('mongoose');
const { spawn } = require('child_process');
const path = require('path');

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...');
  
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nht-slack-bot';
  console.log(`📡 Attempting to connect to: ${mongoUri.replace(/\/\/.*@/, '//***@')}`);
  
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 5000,
    });
    
    console.log('✅ Database connection successful');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('❌ Database connection failed');
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 MongoDB is not running. Please start it:');
      console.log('   macOS: brew services start mongodb-community');
      console.log('   Ubuntu: sudo systemctl start mongod');
      console.log('   Windows: net start MongoDB');
      console.log('   Manual: mongod --dbpath /path/to/your/db');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 MongoDB authentication failed. Check your credentials.');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 MongoDB connection timeout. Check if MongoDB is running and accessible.');
    } else {
      console.log('\n💡 Database error:', error.message);
    }
    
    console.log('\n🔧 Alternative solutions:');
    console.log('   1. Use MongoDB Atlas (cloud): https://www.mongodb.com/atlas');
    console.log('   2. Use Docker: docker run -d -p 27017:27017 mongo');
    console.log('   3. Check your MONGODB_URI environment variable');
    
    return false;
  }
}

async function startApplication() {
  console.log('🚀 Starting application...');
  
  const appPath = path.join(__dirname, 'app.js');
  const child = spawn('node', [appPath], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  child.on('error', (error) => {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  });
  
  child.on('exit', (code) => {
    console.log(`📤 Application exited with code ${code}`);
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down application...');
    child.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down application...');
    child.kill('SIGTERM');
  });
}

async function main() {
  console.log('🎯 Razorpay Onboarding Bot - Database Check\n');
  
  const dbAvailable = await checkDatabaseConnection();
  
  if (dbAvailable) {
    console.log('\n✅ Database is ready. Starting application...\n');
    await startApplication();
  } else {
    console.log('\n❌ Cannot start application without database connection.');
    console.log('Please fix the database issue and try again.');
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { checkDatabaseConnection, startApplication };
