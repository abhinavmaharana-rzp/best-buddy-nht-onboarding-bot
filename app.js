/**
 * Razorpay Employee Onboarding Slack Bot - Main Application Entry Point
 * 
 * This is the main entry point for the Slack bot application that handles:
 * - Employee onboarding workflows
 * - Proctored assessment system
 * - Manager reporting and analytics
 * - Gamification features
 * - Task management and progress tracking
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

// Load environment variables from .env file
require("dotenv").config();

// Core dependencies
const { App } = require("@slack/bolt");           // Slack Bolt framework for building Slack apps
const express = require("express");                // Express.js web framework
const mongoose = require("mongoose");             // MongoDB object modeling library
const path = require("path");                     // Node.js path utility

// Route modules - API endpoints and handlers
const onboardingRoutes = require("./routes/onboarding");     // Onboarding workflow routes
const checklistRoutes = require("./routes/checklist");       // Checklist management routes
const userLookupRoutes = require("./routes/userLookup");     // User lookup and management
const dashboardRoutes = require("./routes/dashboard");       // Admin dashboard routes
const authRoutes = require("./routes/auth");                 // Authentication routes
const assessmentRoutes = require("./routes/assessment");     // Proctored assessment routes
const analyticsRoutes = require("./routes/analytics");       // Analytics and reporting routes

// API documentation
const swaggerUi = require("swagger-ui-express");  // Swagger UI for API documentation
const swaggerSpecs = require("./swagger");        // Swagger API specifications

// Service modules - Business logic and background services
const SchedulerService = require("./services/schedulerService");     // Automated scheduling service
const GamificationService = require("./services/gamificationService"); // Points, badges, and leaderboards

// Dashboard router creator
const createDashboardRouter = require("./routes/dashboard");

/**
 * Initialize Slack Bolt App
 * 
 * Creates a new Slack app instance with Socket Mode enabled for development.
 * Socket Mode allows the app to receive events without needing a public endpoint.
 */
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,              // Bot User OAuth Token
  signingSecret: process.env.SLACK_SIGNING_SECRET, // Signing Secret for request verification
  socketMode: true,                                // Enable Socket Mode for development
  appToken: process.env.SLACK_APP_TOKEN,          // App-Level Token for Socket Mode
  socketModeReceiverOptions: {
    pingInterval: 10000,        // WebSocket ping interval (10 seconds)
    pingTimeout: 5000,          // WebSocket ping timeout (5 seconds)
    reconnectInterval: 1000,    // Reconnection attempt interval (1 second)
    maxReconnectAttempts: 5,    // Maximum reconnection attempts
  },
});

/**
 * Initialize Express Application
 * 
 * Creates an Express app for serving web pages and API endpoints.
 * This handles the dashboard, analytics, and other web interfaces.
 */
const expressApp = express();

// Middleware configuration
expressApp.use(express.json()); // Parse JSON request bodies

// Serve static files (HTML, CSS, JS) from the public directory
expressApp.use(express.static(path.join(__dirname, "public")));

/**
 * Database Connection
 * 
 * Establishes connection to MongoDB database.
 * The connection string is read from environment variables.
 */
mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log("✅ Connected to MongoDB");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

/**
 * API Routes Configuration
 * 
 * Sets up all API endpoints for the application:
 * - Authentication routes for user login
 * - Onboarding routes for employee onboarding workflows
 * - Checklist routes for task management
 * - User lookup routes for user management
 * - Dashboard routes for admin interface
 * - Assessment routes for proctored assessments
 * - Analytics routes for reporting and insights
 */
expressApp.use("/auth", authRoutes);                           // Authentication endpoints
expressApp.use("/onboarding", onboardingRoutes(app));         // Onboarding workflow endpoints
expressApp.use("/checklist", checklistRoutes(app));           // Checklist management endpoints
expressApp.use("/user-lookup", userLookupRoutes);             // User lookup endpoints
expressApp.use("/dashboard", createDashboardRouter(app));     // Admin dashboard endpoints
expressApp.use("/api/assessment", assessmentRoutes);          // Assessment API endpoints
expressApp.use("/api/analytics", analyticsRoutes);            // Analytics API endpoints

/**
 * Web Interface Routes
 * 
 * Serves HTML pages for different user interfaces:
 * - Login page for authentication
 * - Admin dashboard for management
 * - Analytics dashboard for insights
 * - API documentation for developers
 */
expressApp.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

expressApp.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

expressApp.get("/am-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "am-dashboard.html"));
});

expressApp.get("/analytics", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "analytics-dashboard.html"));
});

/**
 * API Documentation
 * 
 * Serves Swagger UI for API documentation at /api-docs
 * This provides interactive documentation for all API endpoints
 */
expressApp.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

/**
 * Application Startup
 * 
 * Initializes and starts both the Slack Bolt app and Express server.
 * This is wrapped in an async IIFE (Immediately Invoked Function Expression)
 * to handle the asynchronous startup process.
 */
(async () => {
  try {
    // Start Slack Bolt app
    await app.start();
    console.log("✅ Slack Bolt app started successfully");

    /**
     * Initialize Background Services
     * 
     * Creates instances of background services that handle:
     * - Automated scheduling (reports, notifications)
     * - Gamification (points, badges, leaderboards)
     */
    const schedulerService = new SchedulerService(app);
    const gamificationService = new GamificationService(app);

    // Start the scheduler service for automated tasks
    schedulerService.start();
    console.log("✅ Scheduler service started");

    /**
     * Start Express Server
     * 
     * Starts the Express server on the specified port (default: 3000).
     * This serves the web interface and API endpoints.
     */
    const PORT = process.env.PORT || 3000;
    expressApp.listen(PORT, () => {
      console.log("🚀 Application started successfully!");
      console.log("=" .repeat(50));
      console.log(`⚡️  Slack Bot: Running`);
      console.log(`🌐 Express Server: http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`📊 Admin Dashboard: http://localhost:${PORT}/dashboard`);
      console.log(`📈 Analytics Dashboard: http://localhost:${PORT}/analytics`);
      console.log(`🎮 Gamification: Active`);
      console.log(`⏰ Scheduler: Running`);
      console.log("=" .repeat(50));
    });
  } catch (error) {
    console.error("❌ Error starting application:", error);
    process.exit(1); // Exit with error code
  }
})();

// Export Express app for testing purposes
module.exports = expressApp;
