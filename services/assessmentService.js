/**
 * Assessment Service
 * 
 * This service handles assessment creation and management without requiring
 * HTTP calls. It provides direct database operations for assessment creation.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const Assessment = require("../models/assessment");
const ProctoringSession = require("../models/proctoringSession");
const assessmentData = require("../data/assessmentData");
const { getAssessmentUrl } = require("../utils/config");

/**
 * Assessment Service Class
 * 
 * Provides direct database operations for assessment management
 */
class AssessmentService {
  /**
   * Start a proctored assessment directly (without HTTP call)
   * @param {Object} params - Assessment parameters
   * @param {string} params.userId - User ID
   * @param {string} params.taskTitle - Task title
   * @param {number} params.weekIndex - Week index
   * @param {number} params.dayIndex - Day index
   * @param {number} params.taskIndex - Task index
   * @param {Object} params.environment - Environment data
   * @returns {Promise<Object>} Assessment data
   */
  async startAssessment({ userId, taskTitle, weekIndex, dayIndex, taskIndex, environment = {} }) {
    try {
      console.log(`🎯 Starting assessment directly for user ${userId}, task: ${taskTitle}`);
      
      // Check if assessment configuration exists
      const config = assessmentData.assessments[taskTitle];
      if (!config) {
        console.error(`❌ Assessment configuration not found for task: ${taskTitle}`);
        console.log(`📋 Available assessments:`, Object.keys(assessmentData.assessments));
        throw new Error("Assessment configuration not found");
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
          throw new Error("Maximum attempts exceeded");
        }

        if (existingAssessment.status === "in_progress") {
          throw new Error("Assessment already in progress");
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
          userAgent: environment.userAgent || "Unknown",
          screenResolution: environment.screenResolution || "Unknown",
          browser: environment.browser || "Unknown",
          os: environment.os || "Unknown",
        },
        metadata: {
          ipAddress: environment.ipAddress || "Unknown",
          location: environment.location || "Unknown",
          timezone: environment.timezone || "Unknown",
        },
      });

      await proctoringSession.save();
      console.log(`✅ Proctoring session created:`, sessionId);

      // Generate assessment URL
      const assessmentUrl = getAssessmentUrl(assessment._id, sessionId);

      return {
        assessmentId: assessment._id,
        sessionId: proctoringSession.sessionId,
        assessmentUrl,
        config: {
          taskTitle: config.taskTitle || taskTitle,
          description: config.description,
          googleFormUrl: config.googleFormUrl,
          passingScore: config.passingScore,
          timeLimit: config.timeLimit,
          maxAttempts: config.maxAttempts,
          proctoringEnabled: config.proctoringEnabled,
        },
        proctoring: assessmentData.proctoring,
        messages: assessmentData.messages,
      };
    } catch (error) {
      console.error("❌ Error starting assessment directly:", error);
      throw error;
    }
  }
}

module.exports = new AssessmentService();
