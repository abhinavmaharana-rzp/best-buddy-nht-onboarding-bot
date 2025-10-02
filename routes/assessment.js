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
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Assessment = require("../models/assessment");
const ProctoringSession = require("../models/proctoringSession");
const TaskApproval = require("../models/taskApproval");
const TaskStatus = require("../models/taskStatus");
const assessmentData = require("../data/assessmentData");
const authMiddleware = require("../utils/auth");
const { simulateGoogleFormsScoring } = require("../utils/scoring");
const { getBaseUrl } = require("../utils/config");

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    baseUrl: getBaseUrl()
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
    
    // Find the assessment in the database
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    // Get assessment configuration from static data
    const config = assessmentData.assessments[assessment.taskTitle];
    if (!config) {
      return res.status(404).json({ error: "Assessment configuration not found" });
    }

    const response = {
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
    };

    res.json(response);
  } catch (error) {
    console.error("Error getting assessment config:", error);
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
        googleFormUrl: config.googleFormUrl,
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
        description: config.description,
        googleFormUrl: config.googleFormUrl,
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
 *     summary: Upload screen recording
 *     tags: [Assessment]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               recording:
 *                 type: string
 *                 format: binary
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recording uploaded successfully
 */
router.post("/upload-recording", upload.single("recording"), async (req, res) => {
  try {
    const { sessionId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No recording file provided" });
    }

    const proctoringSession = await ProctoringSession.findOne({ sessionId });
    if (!proctoringSession) {
      return res.status(404).json({ error: "Proctoring session not found" });
    }

    proctoringSession.screenRecording = {
      enabled: true,
      fileUrl: `/uploads/recordings/${file.filename}`,
      startTime: proctoringSession.startTime,
      endTime: new Date(),
    };

    await proctoringSession.save();

    res.json({ 
      success: true, 
      fileUrl: proctoringSession.screenRecording.fileUrl 
    });
  } catch (error) {
    console.error("Error uploading recording:", error);
    res.status(500).json({ error: "Internal server error" });
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

    // Call webhook for completion notification
    try {
      await fetch(`${getBaseUrl()}/api/assessment/webhook/completion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessmentId: assessment._id,
          userId: assessment.userId,
          score: assessment.score,
          passed: assessment.passed,
          taskTitle: assessment.taskTitle,
        }),
      });
    } catch (webhookError) {
      console.error('Error calling completion webhook:', webhookError);
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
    const { assessmentId, userId, score, passed, taskTitle } = req.body;

    // Get user info for Slack notification
    const userInfo = await req.app.client.users.info({
      token: process.env.SLACK_BOT_TOKEN,
      user: userId,
    });

    if (!userInfo.ok) {
      return res.status(404).json({ error: "User not found" });
    }

    const userName = userInfo.user.profile.real_name || "User";

    // Send notification to user
    const message = passed 
      ? `🎉 Congratulations! You have successfully completed the proctored assessment for "${taskTitle}" with a score of ${score}%.`
      : `❌ Unfortunately, you did not pass the proctored assessment for "${taskTitle}". Your score was ${score}%. Please prepare well and try again.`;

    await req.app.client.chat.postMessage({
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
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Assessment: ${taskTitle} | Score: ${score}% | Status: ${passed ? "Passed" : "Failed"}`,
            },
          ],
        },
      ],
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error processing completion webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
