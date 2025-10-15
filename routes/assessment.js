/**
 * Assessment Routes
 * 
 * This module handles all API endpoints related to proctored assessments including
 * assessment creation, proctoring session management, scoring, and completion handling.
 * It integrates with Google Forms and provides comprehensive proctoring capabilities.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Assessment = require("../models/assessment");
const ProctoringSession = require("../models/proctoringSession");
const TaskApproval = require("../models/taskApproval");
const TaskStatus = require("../models/taskStatus");
const UserProgress = require("../models/userProgress");
const assessmentData = require("../data/assessmentData");
const authMiddleware = require("../utils/auth");
const { getBaseUrl } = require("../utils/config");
const emailService = require("../services/emailService");
const storageService = require("../services/storageService");

// Store Slack app instance globally for this module
let slackApp = null;

const router = express.Router();

// Function to set Slack app instance
function setSlackApp(app) {
  slackApp = app;
}

// Export both router and setter function
module.exports = router;
module.exports.setSlackApp = setSlackApp;

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    baseUrl: getBaseUrl(),
    storage: storageService.getStorageInfo()
  });
});

// Get full assessment data (proctoring config, messages, etc.)
router.get("/data", (req, res) => {
  try {
    res.json({
      proctoring: assessmentData.proctoring,
      messages: assessmentData.messages
    });
  } catch (error) {
    console.error("Error getting assessment data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// NOTE: The config endpoint is defined later in the file (line ~601) with enhanced error handling
// This duplicate definition has been removed to avoid conflicts

/**
 * @swagger
 * /api/admin/assessments:
 *   get:
 *     summary: Get all assessment results for admin dashboard
 *     tags: [Assessment]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assessment results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   taskTitle:
 *                     type: string
 *                   score:
 *                     type: number
 *                   status:
 *                     type: string
 *                   attemptCount:
 *                     type: number
 *                   completedAt:
 *                     type: string
 *                   startedAt:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/admin/assessments", async (req, res) => {
  try {
    console.log("Admin requesting assessment data");
    
    // Get all assessments with user and task details
    const assessments = await Assessment.find({})
      .populate('userId', 'name email')
      .sort({ completedAt: -1, startedAt: -1 })
      .lean();

    // Format the response
    const formattedAssessments = assessments.map(assessment => ({
      _id: assessment._id,
      userId: assessment.userId?.name || assessment.userId || 'Unknown User',
      userEmail: assessment.userId?.email || '',
      taskTitle: assessment.taskTitle,
      score: assessment.score || 0,
      rawScore: assessment.rawScore || 0,
      totalQuestions: assessment.totalQuestions || 0,
      status: assessment.status,
      attemptCount: assessment.attemptCount || 1,
      completedAt: assessment.completedAt,
      startedAt: assessment.startedAt,
      timeSpent: assessment.timeSpent,
      violations: assessment.violations || 0,
      reason: assessment.reason
    }));

    console.log(`Retrieved ${formattedAssessments.length} assessments for admin`);
    res.json(formattedAssessments);
    
  } catch (error) {
    console.error("Error getting admin assessment data:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message 
    });
  }
});

// Removed calculate-score endpoint - now using custom assessment forms

/**
 * @swagger
 * /api/assessment/event:
 *   post:
 *     summary: Log assessment events
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               eventType:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event logged successfully
 */
router.post("/event", async (req, res) => {
  try {
    console.log("Assessment event received:", req.body);
    
    const { sessionId, eventType, data } = req.body;
    
    // Update proctoring session with event
    if (sessionId) {
      await ProctoringSession.findOneAndUpdate(
        { sessionId },
        {
          $push: {
            events: {
              type: eventType,
              data: data || {},
              timestamp: new Date()
            }
          }
        }
      );
    }
    
    res.json({ success: true, message: "Event logged successfully" });
  } catch (error) {
    console.error("Error logging assessment event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/violation:
 *   post:
 *     summary: Log proctoring violations
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               violationType:
 *                 type: string
 *               details:
 *                 type: object
 *     responses:
 *       200:
 *         description: Violation logged successfully
 */
router.post("/violation", async (req, res) => {
  try {
    console.log("Proctoring violation received:", req.body);
    
    const { sessionId, violationType, details } = req.body;
    
    // Update proctoring session with violation
    if (sessionId) {
      await ProctoringSession.findOneAndUpdate(
        { sessionId },
        {
          $push: {
            violations: {
              type: violationType,
              details: details || {},
              timestamp: new Date()
            }
          }
        }
      );
    }
    
    res.json({ success: true, message: "Violation logged successfully" });
  } catch (error) {
    console.error("Error logging violation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/complete:
 *   post:
 *     summary: Complete an assessment with results
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assessmentId
 *               - sessionId
 *               - score
 *               - passed
 *             properties:
 *               assessmentId:
 *                 type: string
 *                 description: Assessment ID
 *               sessionId:
 *                 type: string
 *                 description: Proctoring session ID
 *               score:
 *                 type: number
 *                 description: Assessment score (0-100)
 *               passed:
 *                 type: boolean
 *                 description: Whether the assessment was passed
 *               timeSpent:
 *                 type: number
 *                 description: Time spent in minutes
 *               violations:
 *                 type: number
 *                 description: Number of violations
 *               completedAt:
 *                 type: string
 *                 format: date-time
 *                 description: Completion timestamp
 *     responses:
 *       200:
 *         description: Assessment completed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post("/complete", async (req, res) => {
  try {
    console.log("Assessment completion request:", req.body);
    
    const { assessmentId, sessionId, score, passed, rawScore, totalQuestions, timeSpent, violations, completedAt } = req.body;

    // Validate required fields
    if (!assessmentId || !sessionId || score === undefined || passed === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Update assessment record
    const assessment = await Assessment.findByIdAndUpdate(
      assessmentId,
      {
        status: passed ? "completed" : "failed",
        score: score,
        rawScore: rawScore,
        totalQuestions: totalQuestions,
        passed: passed,
        completedAt: new Date(completedAt),
        timeSpent: timeSpent,
        violations: violations || 0,
        reason: passed ? "Assessment passed" : "Assessment failed"
      },
      { new: true }
    );

    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Update proctoring session
    await ProctoringSession.findOneAndUpdate(
      { sessionId },
      {
        status: "completed",
        endTime: new Date(),
        duration: timeSpent ? Math.floor(timeSpent * 60) : 0
      }
    );

    // Update user progress
    await UserProgress.findOneAndUpdate(
      { userId: assessment.userId },
      {
        $inc: {
          "performance.totalAssessments": 1,
          "performance.passedAssessments": passed ? 1 : 0
        },
        $set: {
          "performance.averageAssessmentScore": await calculateAverageScore(assessment.userId),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Create task approval if passed
    if (passed) {
      const approval = new TaskApproval({
        userId: assessment.userId,
        taskTitle: assessment.taskTitle,
        weekIndex: assessment.weekIndex,
        dayIndex: assessment.dayIndex,
        taskIndex: assessment.taskIndex,
        status: "approved",
        requestedAt: new Date(),
        reviewedAt: new Date(),
        reviewedBy: "system",
        messageTs: "auto-approved",
        channelId: "assessment-system"
      });
      await approval.save();

      // Update task status
      await TaskStatus.findOneAndUpdate(
        { userId: assessment.userId, weekIndex: assessment.weekIndex, dayIndex: assessment.dayIndex, taskIndex: assessment.taskIndex },
        { 
          completed: true,
          score: score,
          rawScore: rawScore,
          totalQuestions: totalQuestions,
          completedAt: new Date()
        },
        { upsert: true }
      );
    }

    console.log(`Assessment completed - User: ${assessment.userId}, Score: ${score}%, Passed: ${passed}`);

    res.json({
      success: true,
      assessmentId: assessment._id,
      score: score,
      rawScore: rawScore,
      totalQuestions: totalQuestions,
      passed: passed,
      message: passed ? "Assessment passed successfully!" : "Assessment not passed. Please try again."
    });

  } catch (error) {
    console.error("Error completing assessment:", error);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message
    });
  }
});

// Helper function to calculate average score
async function calculateAverageScore(userId) {
  try {
    const assessments = await Assessment.find({ 
      userId, 
      status: "completed",
      score: { $exists: true }
    });
    
    if (assessments.length === 0) return 0;
    
    const totalScore = assessments.reduce((sum, assessment) => sum + assessment.score, 0);
    return Math.round(totalScore / assessments.length);
  } catch (error) {
    console.error("Error calculating average score:", error);
    return 0;
  }
}

/**
 * File Upload Configuration
 * 
 * Configures multer for handling screen recording uploads during proctored assessments.
 * Creates upload directory if it doesn't exist and validates file types.
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/recordings");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `recording-${uniqueSuffix}.webm`);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for video files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "video/webm" || file.mimetype === "video/mp4") {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"), false);
    }
  },
});

/**
 * @swagger
 * /api/assessment/config/{assessmentId}:
 *   get:
 *     summary: Get assessment configuration
 *     tags: [Assessment]
 *     parameters:
 *       - in: path
 *         name: assessmentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Assessment ID
 *     responses:
 *       200:
 *         description: Assessment configuration retrieved successfully
 *       404:
 *         description: Assessment not found
 */
/**
 * GET /api/assessment/config/:assessmentId
 * 
 * Retrieves assessment configuration for a specific assessment.
 * Returns proctoring settings, time limits, and other configuration details.
 */
router.get("/config/:assessmentId", async (req, res) => {
  try {
    const { assessmentId } = req.params;
    console.log(`🔍 Assessment config request for ID: ${assessmentId}`);
    
    // Validate assessment ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      console.error(`❌ Invalid assessment ID format: ${assessmentId}`);
      return res.status(400).json({ 
        error: "Invalid assessment ID format",
        code: "INVALID_ASSESSMENT_ID",
        assessmentId: assessmentId
      });
    }
    
    // Find the assessment in the database
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      console.error(`❌ Assessment not found: ${assessmentId}`);
      
      // Check if there are any assessments at all
      const totalAssessments = await Assessment.countDocuments();
      console.log(`📊 Total assessments in database: ${totalAssessments}`);
      
      // Show recent assessments for debugging
      const recentAssessments = await Assessment.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('_id taskTitle status createdAt');
      console.log(`📋 Recent assessments:`, recentAssessments);
      
      return res.status(404).json({ 
        error: "Assessment not found",
        code: "ASSESSMENT_NOT_FOUND",
        assessmentId: assessmentId,
        totalAssessments: totalAssessments,
        recentAssessments: recentAssessments
      });
    }

    console.log(`✅ Assessment found: ${assessment.taskTitle} (${assessment.status})`);

    // Get assessment configuration from static data
    const config = assessmentData.assessments[assessment.taskTitle];
    if (!config) {
      console.error(`❌ Assessment configuration not found for task: ${assessment.taskTitle}`);
      console.log(`📋 Available assessments:`, Object.keys(assessmentData.assessments));
      return res.status(404).json({ 
        error: "Assessment configuration not found",
        code: "CONFIG_NOT_FOUND",
        taskTitle: assessment.taskTitle,
        availableAssessments: Object.keys(assessmentData.assessments)
      });
    }

    console.log(`✅ Assessment config found for: ${assessment.taskTitle}`);

    const response = {
      assessmentId: assessment._id,
      taskTitle: assessment.taskTitle,
      title: config.title || assessment.taskTitle,
      description: config.description,
      questions: config.questions,
      passingScore: config.passingScore,
      timeLimit: config.timeLimit,
      maxAttempts: config.maxAttempts,
      proctoringEnabled: config.proctoringEnabled,
      weekIndex: assessment.weekIndex,
      dayIndex: assessment.dayIndex,
      taskIndex: assessment.taskIndex,
    };

    console.log(`✅ Returning assessment config for: ${assessment.taskTitle}`);
    res.json(response);
  } catch (error) {
    console.error("❌ Error getting assessment config:", error);
    res.status(500).json({ 
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      message: error.message
    });
  }
});

/**
 * @swagger
 * /api/assessment/practice:
 *   post:
 *     summary: Start a practice assessment (no recording, unlimited attempts)
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               taskTitle:
 *                 type: string
 *     responses:
 *       200:
 *         description: Practice assessment started
 */
router.post("/practice", async (req, res) => {
  try {
    const { taskTitle } = req.body;
    
    if (!taskTitle) {
      return res.status(400).json({ error: "Task title is required" });
    }
    
    const config = assessmentData.assessments[taskTitle];
    if (!config) {
      return res.status(400).json({ error: "Assessment configuration not found" });
    }
    
    const sessionId = `practice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      mode: 'practice',
      sessionId: sessionId,
      config: {
        taskTitle: taskTitle,
        title: config.title || taskTitle,
        description: config.description,
        questions: config.questions,
        passingScore: config.passingScore,
        timeLimit: config.timeLimit,
        proctoringEnabled: false, // No proctoring in practice mode
      }
    });
  } catch (error) {
    console.error("Error starting practice assessment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/start:
 *   post:
 *     summary: Start a proctored assessment
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - taskTitle
 *               - weekIndex
 *               - dayIndex
 *               - taskIndex
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID
 *               taskTitle:
 *                 type: string
 *                 description: Task title
 *               weekIndex:
 *                 type: integer
 *                 description: Week index
 *               dayIndex:
 *                 type: integer
 *                 description: Day index
 *               taskIndex:
 *                 type: integer
 *                 description: Task index
 *               practiceMode:
 *                 type: boolean
 *                 description: Whether this is a practice run
 *     responses:
 *       200:
 *         description: Assessment started successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Internal server error
 */
router.post("/start", async (req, res) => {
  try {
    console.log(`🎯 Assessment start request received:`, req.body);
    
    const { userId, taskTitle, weekIndex, dayIndex, taskIndex } = req.body;

    // Validate required fields
    if (!userId || !taskTitle || weekIndex === undefined || dayIndex === undefined || taskIndex === undefined) {
      console.error(`❌ Missing required fields:`, { userId, taskTitle, weekIndex, dayIndex, taskIndex });
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if assessment configuration exists
    const config = assessmentData.assessments[taskTitle];
    if (!config) {
      console.error(`❌ Assessment configuration not found for task: ${taskTitle}`);
      console.log(`📋 Available assessments:`, Object.keys(assessmentData.assessments));
      return res.status(400).json({ error: "Assessment configuration not found" });
    }

    console.log(`✅ Found assessment config for ${taskTitle}:`, config);

    // Check if user has already attempted this assessment
    const existingAssessment = await Assessment.findOne({
      userId,
      weekIndex,
      dayIndex,
      taskIndex,
    });

    if (existingAssessment) {
      if (existingAssessment.attemptCount >= config.maxAttempts) {
        return res.status(400).json({ 
          error: "Maximum attempts exceeded",
          message: "You have exceeded the maximum number of attempts for this assessment."
        });
      }

      if (existingAssessment.status === "in_progress") {
        return res.status(400).json({ 
          error: "Assessment already in progress",
          message: "You already have an assessment in progress for this task."
        });
      }
    }

    // Create or update assessment
    console.log(`💾 Creating/updating assessment in database...`);
    const assessment = await Assessment.findOneAndUpdate(
      { userId, weekIndex, dayIndex, taskIndex },
      {
        userId,
        taskTitle,
        weekIndex,
        dayIndex,
        taskIndex,
        questions: config.questions,
        totalQuestions: config.questions ? config.questions.length : 0,
        passingScore: config.passingScore,
        maxAttempts: config.maxAttempts,
        status: "in_progress",
        startedAt: new Date(),
        attemptCount: existingAssessment ? existingAssessment.attemptCount + 1 : 1,
        createdBy: "system",
      },
      { upsert: true, new: true }
    );

    console.log(`✅ Assessment created/updated:`, assessment._id);

    // Create proctoring session
    console.log(`🎥 Creating proctoring session...`);
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const proctoringSession = new ProctoringSession({
      sessionId,
      userId,
      assessmentId: assessment._id,
      status: "active",
      startTime: new Date(),
      environment: {
        userAgent: req.headers["user-agent"],
        screenResolution: req.body.screenResolution || "Unknown",
        browser: req.body.browser || "Unknown",
        os: req.body.os || "Unknown",
      },
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        location: req.body.location || "Unknown",
        timezone: req.body.timezone || "Unknown",
      },
    });

    await proctoringSession.save();
    console.log(`✅ Proctoring session created:`, sessionId);

    res.json({
      assessmentId: assessment._id,
      sessionId: proctoringSession.sessionId,
      config: {
        taskTitle: assessment.taskTitle,
        title: config.title || assessment.taskTitle,
        description: config.description,
        questions: config.questions,
        passingScore: config.passingScore,
        timeLimit: config.timeLimit,
        maxAttempts: config.maxAttempts,
        proctoringEnabled: config.proctoringEnabled,
      },
      proctoring: assessmentData.proctoring,
      messages: assessmentData.messages,
    });
  } catch (error) {
    console.error("❌ Error starting assessment:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({ 
      error: "Internal server error",
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @swagger
 * /api/assessment/event:
 *   post:
 *     summary: Handle assessment events
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
 *               - sessionId
 *               - data
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [started, completed, terminated, heartbeat]
 *               sessionId:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event processed successfully
 */
router.post("/event", async (req, res) => {
  try {
    const { eventType, sessionId, data } = req.body;

    const proctoringSession = await ProctoringSession.findOne({ sessionId });
    if (!proctoringSession) {
      return res.status(404).json({ error: "Proctoring session not found" });
    }

    switch (eventType) {
      case "started":
        proctoringSession.status = "active";
        proctoringSession.startTime = data.startTime;
        break;
      case "completed":
        proctoringSession.status = "completed";
        proctoringSession.endTime = data.endTime;
        proctoringSession.duration = data.duration;
        break;
      case "terminated":
        proctoringSession.status = "terminated";
        proctoringSession.endTime = new Date();
        break;
      case "heartbeat":
        // Update last activity
        proctoringSession.lastActivity = new Date();
        break;
    }

    await proctoringSession.save();
    res.json({ success: true });
  } catch (error) {
    console.error("Error processing assessment event:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/violation:
 *   post:
 *     summary: Report assessment violation
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *               - violation
 *             properties:
 *               sessionId:
 *                 type: string
 *               violation:
 *                 type: object
 *     responses:
 *       200:
 *         description: Violation reported successfully
 */
router.post("/violation", async (req, res) => {
  try {
    const { sessionId, violation } = req.body;

    const proctoringSession = await ProctoringSession.findOne({ sessionId });
    if (!proctoringSession) {
      return res.status(404).json({ error: "Proctoring session not found" });
    }

    proctoringSession.violations.push(violation);
    await proctoringSession.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Error reporting violation:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/upload-recording:
 *   post:
 *     summary: Upload screen or webcam recording
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               screenRecording:
 *                 type: string
 *                 format: binary
 *               webcamRecording:
 *                 type: string
 *                 format: binary
 *               sessionId:
 *                 type: string
 *               recordingType:
 *                 type: string
 *                 enum: [screen, webcam]
 *     responses:
 *       200:
 *         description: Recording uploaded successfully
 */
/**
 * @swagger
 * /api/assessment/upload-chunk:
 *   post:
 *     summary: Upload video chunk during recording (streaming upload)
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *               sessionId:
 *                 type: string
 *               recordingType:
 *                 type: string
 *               chunkTimestamp:
 *                 type: number
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
 */
router.post("/upload-chunk", upload.single("chunk"), async (req, res) => {
  try {
    const { sessionId, recordingType, chunkTimestamp } = req.body;
    const file = req.file;

    if (!file || !sessionId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`📦 Chunk upload: ${recordingType} for session ${sessionId}`);
    
    // Upload using storage service (S3 or local)
    const uploadResult = await storageService.uploadRecording(file, sessionId, `${recordingType}_chunk_${chunkTimestamp}`);
    
    console.log(`✅ Chunk saved via ${uploadResult.storage}: ${uploadResult.fileUrl}`);
    
    res.json({ 
      success: true,
      message: "Chunk uploaded successfully",
      storage: uploadResult.storage,
      fileUrl: uploadResult.fileUrl,
      size: file.size
    });
  } catch (error) {
    console.error("Error uploading chunk:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

router.post("/upload-recording", upload.fields([
  { name: 'screenRecording', maxCount: 1 },
  { name: 'webcamRecording', maxCount: 1 }
]), async (req, res) => {
  try {
    const { sessionId, recordingType } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const proctoringSession = await ProctoringSession.findOne({ sessionId });
    if (!proctoringSession) {
      return res.status(404).json({ error: "Proctoring session not found" });
    }

    let fileUrl = null;
    let storageType = 'none';
    
    // Handle screen recording
    if (req.files && req.files.screenRecording && req.files.screenRecording[0]) {
      const file = req.files.screenRecording[0];
      
      // Upload using storage service (S3 or local)
      const uploadResult = await storageService.uploadRecording(file, sessionId, 'screen');
      fileUrl = uploadResult.fileUrl;
      storageType = uploadResult.storage;
      
      proctoringSession.screenRecording = {
        enabled: true,
        fileUrl: fileUrl,
        startTime: proctoringSession.startTime,
        endTime: new Date(),
      };
      
      console.log(`✅ Screen recording uploaded via ${storageType}: ${fileUrl}`);
    }
    
    // Handle webcam recording
    if (req.files && req.files.webcamRecording && req.files.webcamRecording[0]) {
      const file = req.files.webcamRecording[0];
      
      // Upload using storage service (S3 or local)
      const uploadResult = await storageService.uploadRecording(file, sessionId, 'webcam');
      fileUrl = uploadResult.fileUrl;
      storageType = uploadResult.storage;
      
      proctoringSession.webcamRecording = {
        enabled: true,
        fileUrl: fileUrl,
        startTime: proctoringSession.startTime,
        endTime: new Date(),
      };
      
      console.log(`✅ Webcam recording uploaded via ${storageType}: ${fileUrl}`);
    }

    if (!fileUrl) {
      return res.status(400).json({ error: "No recording file provided" });
    }

    await proctoringSession.save();

    res.json({ 
      success: true, 
      fileUrl: fileUrl,
      storage: storageType,
      recordingType: recordingType
    });
  } catch (error) {
    console.error("Error uploading recording:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

/**
 * @swagger
 * /api/assessment/complete:
 *   post:
 *     summary: Complete assessment with score
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assessmentId
 *               - sessionId
 *               - score
 *               - passed
 *             properties:
 *               assessmentId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               score:
 *                 type: number
 *               passed:
 *                 type: boolean
 *               reason:
 *                 type: string
 *               timeSpent:
 *                 type: number
 *     responses:
 *       200:
 *         description: Assessment completed successfully
 */
router.post("/complete", async (req, res) => {
  try {
    const { assessmentId, sessionId, reason, timeSpent } = req.body;

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const proctoringSession = await ProctoringSession.findOne({ sessionId });
    if (!proctoringSession) {
      return res.status(404).json({ error: "Proctoring session not found" });
    }

    // Calculate score using the scoring system
    const scoringResult = await simulateGoogleFormsScoring(assessment.googleFormUrl, {
      timeSpent: timeSpent / 60, // Convert to minutes
      violations: proctoringSession.violations.length,
      attemptCount: assessment.attemptCount,
    });

    const { score, passed, feedback } = scoringResult;

    // Update assessment
    assessment.status = passed ? "completed" : "failed";
    assessment.score = score;
    assessment.passed = passed;
    assessment.completedAt = new Date();
    assessment.feedback = feedback;

    await assessment.save();

    // Update proctoring session
    proctoringSession.status = "completed";
    proctoringSession.endTime = new Date();
    proctoringSession.duration = timeSpent;

    await proctoringSession.save();

    // If passed, update task status and create approval
    if (passed) {
      // Update task status
      await TaskStatus.findOneAndUpdate(
        {
          userId: assessment.userId,
          weekIndex: assessment.weekIndex,
          dayIndex: assessment.dayIndex,
          taskIndex: assessment.taskIndex,
        },
        { completed: true },
        { upsert: true }
      );

      // Create approval request
      const approval = new TaskApproval({
        userId: assessment.userId,
        taskTitle: assessment.taskTitle,
        weekIndex: assessment.weekIndex,
        dayIndex: assessment.dayIndex,
        taskIndex: assessment.taskIndex,
        status: "approved", // Auto-approve if assessment passed
        reviewedAt: new Date(),
        reviewedBy: "system",
        messageTs: "assessment_completed",
        channelId: "assessment_channel",
      });

      await approval.save();
    }

    // Send Slack notification directly
    if (slackApp && slackApp.client) {
      try {
        const scoreDisplay = rawScore && totalQuestions 
          ? `${rawScore}/${totalQuestions} (${score}%)`
          : `${score}%`;
          
        const message = passed 
          ? `🎉 *Congratulations!* You have successfully completed the proctored assessment for *"${assessment.taskTitle}"*!\n\n*Your Score:* ${scoreDisplay}\n*Status:* ✅ Passed\n\nGreat job! Your results have been recorded.`
          : `📊 You have completed the proctored assessment for *"${assessment.taskTitle}"*.\n\n*Your Score:* ${scoreDisplay}\n*Status:* ❌ Not Passed\n*Passing Score Required:* 80%\n\nPlease review the material and try again. You can do it!`;

        await slackApp.client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: assessment.userId,
          text: message,
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: message,
              },
            },
            {
              type: "divider"
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Assessment: ${assessment.taskTitle} | Score: ${scoreDisplay} | Status: ${passed ? "✅ Passed" : "❌ Failed"}`,
                },
              ],
            },
          ],
        });

        console.log(`✅ Slack notification sent to user ${assessment.userId} for assessment completion`);
        
        // Get user info for email
        try {
          const userInfo = await slackApp.client.users.info({
            token: process.env.SLACK_BOT_TOKEN,
            user: assessment.userId,
          });
          
          if (userInfo.ok && userInfo.user.profile.email) {
            const userName = userInfo.user.profile.real_name || userInfo.user.name;
            const userEmail = userInfo.user.profile.email;
            
            // Send email notification
            await emailService.sendAssessmentCompletionEmail(userEmail, userName, {
              taskTitle: assessment.taskTitle,
              score: score,
              rawScore: rawScore,
              totalQuestions: totalQuestions,
              passed: passed
            });
            
            console.log(`✅ Email notification sent to ${userEmail}`);
          }
        } catch (emailError) {
          console.error('❌ Error sending email notification:', emailError);
          // Don't fail the whole process if email fails
        }
      } catch (slackError) {
        console.error('❌ Error sending Slack notification:', slackError);
      }
    } else {
      console.warn('⚠️ Slack app not initialized, skipping notification');
    }

    res.json({ 
      success: true, 
      assessment: {
        id: assessment._id,
        score: assessment.score,
        passed: assessment.passed,
        status: assessment.status,
      }
    });
  } catch (error) {
    console.error("Error completing assessment:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/results/{userId}:
 *   get:
 *     summary: Get user's assessment results
 *     tags: [Assessment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Assessment results retrieved successfully
 */
router.get("/results/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const assessments = await Assessment.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const results = assessments.map(assessment => ({
      id: assessment._id,
      taskTitle: assessment.taskTitle,
      score: assessment.score,
      passed: assessment.passed,
      status: assessment.status,
      attemptCount: assessment.attemptCount,
      maxAttempts: assessment.maxAttempts,
      startedAt: assessment.startedAt,
      completedAt: assessment.completedAt,
      feedback: assessment.feedback,
    }));

    res.json(results);
  } catch (error) {
    console.error("Error getting assessment results:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/sessions/all:
 *   get:
 *     summary: Get all proctoring sessions (Admin)
 *     tags: [Assessment]
 *     responses:
 *       200:
 *         description: All proctoring sessions retrieved successfully
 */
router.get("/sessions/all", async (req, res) => {
  try {
    console.log("📹 Admin requesting all proctoring sessions");
    
    const sessions = await ProctoringSession.find({})
      .populate("assessmentId")
      .sort({ createdAt: -1 })
      .limit(100) // Limit to last 100 sessions
      .lean();

    const results = sessions.map(session => ({
      _id: session._id,
      sessionId: session.sessionId,
      userId: session.userId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      violations: session.violations || [],
      screenRecording: session.screenRecording,
      webcamRecording: session.webcamRecording,
      environment: session.environment,
      metadata: session.metadata,
      assessment: session.assessmentId ? {
        taskTitle: session.assessmentId.taskTitle,
        score: session.assessmentId.score,
        passed: session.assessmentId.passed,
      } : null,
    }));

    console.log(`✅ Retrieved ${results.length} proctoring sessions`);
    res.json(results);
  } catch (error) {
    console.error("❌ Error getting all proctoring sessions:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

/**
 * @swagger
 * /api/assessment/sessions/{sessionId}/details:
 *   get:
 *     summary: Get detailed session information (Admin)
 *     tags: [Assessment]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Session ID or MongoDB _id
 *     responses:
 *       200:
 *         description: Session details retrieved successfully
 */
router.get("/sessions/:sessionId/details", async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log(`📹 Fetching details for session: ${sessionId}`);
    
    // Try to find by either sessionId or _id
    const session = await ProctoringSession.findOne({
      $or: [
        { sessionId: sessionId },
        { _id: mongoose.Types.ObjectId.isValid(sessionId) ? sessionId : null }
      ]
    })
      .populate("assessmentId")
      .lean();

    if (!session) {
      console.error(`❌ Session not found: ${sessionId}`);
      return res.status(404).json({ error: "Session not found" });
    }

    const result = {
      _id: session._id,
      sessionId: session.sessionId,
      userId: session.userId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      violations: session.violations || [],
      screenRecording: session.screenRecording,
      webcamRecording: session.webcamRecording,
      environment: session.environment,
      metadata: session.metadata,
      assessment: session.assessmentId ? {
        taskTitle: session.assessmentId.taskTitle,
        score: session.assessmentId.score,
        rawScore: session.assessmentId.rawScore,
        totalQuestions: session.assessmentId.totalQuestions,
        passed: session.assessmentId.passed,
        completedAt: session.assessmentId.completedAt,
      } : null,
    };

    console.log(`✅ Session details retrieved for ${sessionId}`);
    res.json(result);
  } catch (error) {
    console.error("❌ Error getting session details:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});

/**
 * @swagger
 * /api/assessment/sessions/{userId}:
 *   get:
 *     summary: Get user's proctoring sessions
 *     tags: [Assessment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Proctoring sessions retrieved successfully
 */
router.get("/sessions/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await ProctoringSession.find({ userId })
      .populate("assessmentId")
      .sort({ createdAt: -1 })
      .lean();

    const results = sessions.map(session => ({
      id: session._id,
      sessionId: session.sessionId,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.duration,
      violations: session.violations.length,
      assessment: session.assessmentId ? {
        taskTitle: session.assessmentId.taskTitle,
        score: session.assessmentId.score,
        passed: session.assessmentId.passed,
      } : null,
    }));

    res.json(results);
  } catch (error) {
    console.error("Error getting proctoring sessions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/assessment/webhook/completion:
 *   post:
 *     summary: Webhook for assessment completion notifications
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assessmentId:
 *                 type: string
 *               userId:
 *                 type: string
 *               score:
 *                 type: number
 *               rawScore:
 *                 type: number
 *               totalQuestions:
 *                 type: number
 *               passed:
 *                 type: boolean
 *               taskTitle:
 *                 type: string
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
router.post("/webhook/completion", async (req, res) => {
  try {
    const { assessmentId, userId, score, rawScore, totalQuestions, passed, taskTitle } = req.body;

    console.log(`📬 Webhook received for user ${userId}, assessment: ${taskTitle}, score: ${score}%, passed: ${passed}`);

    if (!slackApp || !slackApp.client) {
      console.error("❌ Slack app not initialized");
      return res.status(500).json({ error: "Slack app not initialized" });
    }

    try {
      // Send notification to user via Slack DM
      const scoreDisplay = rawScore && totalQuestions 
        ? `${rawScore}/${totalQuestions} (${score}%)`
        : `${score}%`;
        
      const message = passed 
        ? `🎉 *Congratulations!* You have successfully completed the proctored assessment for *"${taskTitle}"*!\n\n*Your Score:* ${scoreDisplay}\n*Status:* ✅ Passed\n\nGreat job! Your results have been recorded.`
        : `📊 You have completed the proctored assessment for *"${taskTitle}"*.\n\n*Your Score:* ${scoreDisplay}\n*Status:* ❌ Not Passed\n*Passing Score Required:* 80%\n\nPlease review the material and try again. You can do it!`;

      await slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        text: message,
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: message,
            },
          },
          {
            type: "divider"
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Assessment: ${taskTitle} | Score: ${scoreDisplay} | Status: ${passed ? "✅ Passed" : "❌ Failed"}`,
              },
            ],
          },
        ],
      });

      console.log(`✅ Slack notification sent successfully to user ${userId}`);
      res.json({ success: true, message: "Notification sent successfully" });
    } catch (slackError) {
      console.error("❌ Error sending Slack notification:", slackError);
      res.status(500).json({ 
        error: "Failed to send Slack notification", 
        details: slackError.message 
      });
    }

  } catch (error) {
    console.error("❌ Error processing completion webhook:", error);
    res.status(500).json({ error: "Internal server error", message: error.message });
  }
});
