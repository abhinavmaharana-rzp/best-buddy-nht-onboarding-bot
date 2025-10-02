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
          console.log(`🔄 Assessment already in progress, resuming existing assessment...`);
          
          // Check if the proctoring session is still active
          const existingSession = await ProctoringSession.findOne({
            assessmentId: existingAssessment._id,
            status: "active"
          });

          if (existingSession) {
            console.log(`✅ Found active proctoring session: ${existingSession.sessionId}`);
            
            // Return the existing assessment data
            const assessmentUrl = getAssessmentUrl(existingAssessment._id, existingSession.sessionId);
            
            return {
              assessmentId: existingAssessment._id,
              sessionId: existingSession.sessionId,
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
              resumed: true
            };
          } else {
            console.log(`⚠️ No active proctoring session found, starting new assessment...`);
            // Mark the old assessment as failed and start a new one
            await Assessment.findByIdAndUpdate(existingAssessment._id, {
              status: "failed",
              completedAt: new Date(),
              reason: "Session abandoned"
            });
          }
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

  /**
   * Clean up abandoned assessments (older than 1 hour)
   * This can be called periodically to clean up stale assessments
   */
  async cleanupAbandonedAssessments() {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Find assessments that are in progress but older than 1 hour
      const abandonedAssessments = await Assessment.find({
        status: "in_progress",
        startedAt: { $lt: oneHourAgo }
      });

      console.log(`🧹 Found ${abandonedAssessments.length} abandoned assessments to clean up`);

      for (const assessment of abandonedAssessments) {
        // Mark assessment as failed
        await Assessment.findByIdAndUpdate(assessment._id, {
          status: "failed",
          completedAt: new Date(),
          reason: "Session timeout - abandoned"
        });

        // Mark proctoring session as terminated
        await ProctoringSession.updateMany(
          { assessmentId: assessment._id, status: "active" },
          { 
            status: "terminated",
            endTime: new Date(),
            duration: Math.floor((Date.now() - assessment.startedAt.getTime()) / 1000)
          }
        );

        console.log(`✅ Cleaned up abandoned assessment: ${assessment._id}`);
      }

      return abandonedAssessments.length;
    } catch (error) {
      console.error("❌ Error cleaning up abandoned assessments:", error);
      throw error;
    }
  }
}

module.exports = new AssessmentService();
