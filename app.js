// Description: This is the main entry point for the Slack app. It initializes the app, connects to MongoDB, and sets up routes for onboarding and checklist functionalities.
require('dotenv').config();
const { App, AwsLambdaReceiver } = require('@slack/bolt');
const express = require('express');
const mongoose = require('mongoose');
const onboardingRoutes = require('./routes/onboarding');
const checklistRoutes = require('./routes/checklist');

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true, // Enable Socket Mode
    appToken: process.env.SLACK_APP_TOKEN, // Add the app-level token
    socketModeReceiverOptions: {
      pingInterval: 10000 // Increase to 10 seconds (in milliseconds)
    }
});

const expressApp = express();
expressApp.use(express.json()); // for parsing application/json

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Routes
expressApp.use('/onboarding', onboardingRoutes(app)); // Pass the Bolt app instance
expressApp.use('/checklist', checklistRoutes(app));   // Pass the Bolt app instance

// Start the Bolt app
(async () => {
  try {
    // Start Bolt app
    await app.start();

    // Start Express app
    expressApp.listen(process.env.PORT || 3000, () => {
      console.log(`⚡️ Bolt app is running!`);
      console.log(`⚡️ Express app is running on port ${process.env.PORT || 3000}`);
    });
  } catch (error) {
    console.error('Error starting app:', error);
  }
})();