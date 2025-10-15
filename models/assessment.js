/**
 * Assessment Model
 * 
 * This model represents a proctored assessment taken by a user as part of their onboarding.
 * It tracks the assessment lifecycle from creation to completion, including proctoring data,
 * scoring, and violation tracking.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Assessment Schema Definition
 * 
 * Defines the structure for storing assessment data including:
 * - User identification and task details
 * - Assessment status and scoring
 * - Proctoring data and violations
 * - Attempt tracking and feedback
 */
const assessmentSchema = new mongoose.Schema({
  // User and Task Identification
  userId: {
    type: String,
    required: true,
    // Note: Indexed via compound index below (userId + weekIndex + dayIndex + taskIndex)
    comment: "Slack user ID of the person taking the assessment"
  },
  taskTitle: {
    type: String,
    required: true,
    comment: "Title of the onboarding task that requires assessment"
  },
  weekIndex: {
    type: Number,
    required: true,
    comment: "Week number in the onboarding plan (0-based index)"
  },
  dayIndex: {
    type: Number,
    required: true,
    comment: "Day number within the week (0-based index)"
  },
  taskIndex: {
    type: Number,
    required: true,
    comment: "Task number within the day (0-based index)"
  },
  questions: [{
    id: { type: Number },
    question: { type: String },
    options: [{ type: String }],
    correctAnswer: { type: String },
    explanation: { type: String }
  }],
  rawScore: {
    type: Number,
    min: 0,
    comment: "Number of correct answers"
  },
  totalQuestions: {
    type: Number,
    min: 0,
    comment: "Total number of questions in the assessment"
  },
  timeSpent: {
    type: Number,
    comment: "Time spent on the assessment in minutes"
  },
  violations: {
    type: Number,
    default: 0,
    comment: "Number of proctoring violations detected"
  },
  reason: {
    type: String,
    comment: "Reason for completion status (passed/failed/terminated)"
  },

  // Assessment Status and Scoring
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "failed"],
    default: "pending",
    comment: "Current status of the assessment"
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
    comment: "Final score achieved (0-100)"
  },
  passingScore: {
    type: Number,
    default: 80,
    comment: "Minimum score required to pass the assessment"
  },
  passed: {
    type: Boolean,
    default: false,
    comment: "Whether the user passed the assessment"
  },

  // Timing Information
  startedAt: {
    type: Date,
    comment: "When the user started the assessment"
  },
  completedAt: {
    type: Date,
    comment: "When the user completed the assessment"
  },

  // Proctoring Data
  proctoringData: {
    sessionId: {
      type: String,
      comment: "Unique identifier for the proctoring session"
    },
    recordingUrl: {
      type: String,
      comment: "URL to the recorded screen session"
    },
    violations: [{
      type: {
        type: String,
        comment: "Type of violation (e.g., 'tab_switch', 'copy_paste')"
      },
      timestamp: {
        type: Date,
        comment: "When the violation occurred"
      },
      description: {
        type: String,
        comment: "Human-readable description of the violation"
      }
    }],
    screenRecording: {
      startTime: {
        type: Date,
        comment: "When screen recording started"
      },
      endTime: {
        type: Date,
        comment: "When screen recording ended"
      },
      fileUrl: {
        type: String,
        comment: "URL to the recorded video file"
      }
    }
  },

  // Attempt Tracking
  attemptCount: {
    type: Number,
    default: 0,
    comment: "Number of attempts made for this assessment"
  },
  maxAttempts: {
    type: Number,
    default: 3,
    comment: "Maximum number of attempts allowed"
  },

  // Feedback and Metadata
  feedback: {
    type: String,
    comment: "Feedback provided to the user about their performance"
  },
  createdBy: {
    type: String,
    required: false,
    default: "system",
    comment: "Who created this assessment (system, admin, etc.)"
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

/**
 * Database Indexes
 * 
 * Creates compound indexes for efficient querying:
 * - Unique index on user + task combination to prevent duplicates
 * - Individual index on userId for user-based queries
 */
assessmentSchema.index(
  { userId: 1, weekIndex: 1, dayIndex: 1, taskIndex: 1 },
  { unique: true, comment: "Ensures one assessment per user per task" }
);

// Export the Assessment model
module.exports = mongoose.model("Assessment", assessmentSchema);
