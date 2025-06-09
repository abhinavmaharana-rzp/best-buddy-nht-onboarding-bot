// Description: This is the main entry point for the Slack app. It initializes the app, connects to MongoDB, and sets up routes for onboarding and checklist functionalities.
require('dotenv').config();
const { App, AwsLambdaReceiver } = require('@slack/bolt');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const onboardingRoutes = require('./routes/onboarding');
const amOnboardingRoutes = require('./routes/amOnboarding');
const checklistRoutes = require('./routes/checklist');
const userLookupRoutes = require('./routes/userLookup');
const dashboardRoutes = require('./routes/dashboard');
const amDashboardRoutes = require('./routes/amDashboard');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./swagger');
const authRoutes = require('./routes/auth');

// Import the dashboard router creator
const createDashboardRouter = require('./routes/dashboard');
const createAmDashboardRouter = require('./routes/amDashboard');

// Initializes your app with your bot token and signing secret
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true, // Enable Socket Mode
    appToken: process.env.SLACK_APP_TOKEN, // Add the app-level token
    socketModeReceiverOptions: {
        pingInterval: 10000, // Reduce to 10 seconds
        pingTimeout: 5000,   // Add explicit timeout
        reconnectInterval: 1000, // Add reconnect interval
        maxReconnectAttempts: 5  // Add max reconnect attempts
    }
});

const expressApp = express();
expressApp.use(express.json()); // for parsing application/json

// Serve static files from the public directory
expressApp.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Routes
expressApp.use('/auth', authRoutes);
expressApp.use('/onboarding', onboardingRoutes(app));
expressApp.use('/am-onboarding', amOnboardingRoutes(app));
expressApp.use('/checklist', checklistRoutes(app));
expressApp.use('/user-lookup', userLookupRoutes);
expressApp.use('/dashboard', createDashboardRouter(app));
expressApp.use('/am-dashboard', createAmDashboardRouter(app));

// Serve login page at root
expressApp.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve dashboard at /dashboard
expressApp.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve AM dashboard at /am-dashboard
expressApp.get('/am-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'am-dashboard.html'));
});

// Swagger UI
expressApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Start the Bolt app
(async () => {
  try {
    // Start Bolt app
    await app.start();

    // Start Express app
    expressApp.listen(process.env.PORT || 3000, () => {
      console.log(`⚡️ Bolt app is running!`);
      console.log(`⚡️ Express app is running on port ${process.env.PORT || 3000}`);
      console.log(`📚 API Documentation available at http://localhost:${process.env.PORT || 3000}/api-docs`);
      console.log(`📊 Dashboard available at http://localhost:${process.env.PORT || 3000}`);
      console.log(`📊 AM Dashboard available at http://localhost:${process.env.PORT || 3000}/am-dashboard`);
    });
  } catch (error) {
    console.error('Error starting app:', error);
  }
})();

module.exports = expressApp;