/**
 * Proctoring Session Model
 * 
 * This model tracks individual proctoring sessions during assessments.
 * It monitors user behavior, detects violations, records technical issues,
 * and maintains comprehensive session data for security and compliance.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Proctoring Session Schema Definition
 * 
 * Defines the structure for storing proctoring session data including:
 * - Session identification and user tracking
 * - Violation detection and recording
 * - Technical environment monitoring
 * - Security and compliance data
 */
const proctoringSessionSchema = new mongoose.Schema({
  // Session Identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    comment: "Unique identifier for the proctoring session"
  },
  userId: {
    type: String,
    required: true,
    comment: "Slack user ID of the person being proctored"
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assessment",
    required: true,
    comment: "Reference to the associated assessment"
  },
  status: {
    type: String,
    enum: ["active", "completed", "terminated", "failed"],
    default: "active",
    comment: "Current status of the proctoring session"
  },
  // Timing Information
  startTime: {
    type: Date,
    required: true,
    comment: "When the proctoring session started"
  },
  endTime: {
    type: Date,
    comment: "When the proctoring session ended"
  },
  duration: {
    type: Number,
    comment: "Total session duration in seconds"
  },

  // Screen Recording
  screenRecording: {
    enabled: {
      type: Boolean,
      default: true,
      comment: "Whether screen recording is enabled for this session"
    },
    fileUrl: {
      type: String,
      comment: "URL to the recorded video file"
    },
    startTime: {
      type: Date,
      comment: "When screen recording started"
    },
    endTime: {
      type: Date,
      comment: "When screen recording ended"
    }
  },

  // Violation Tracking
  violations: [{
    type: {
      type: String,
      enum: ["tab_switch", "window_focus_loss", "copy_paste", "right_click", "keyboard_shortcut", "multiple_windows"],
      required: true,
      comment: "Type of violation detected"
    },
    timestamp: {
      type: Date,
      required: true,
      comment: "When the violation occurred"
    },
    description: {
      type: String,
      comment: "Human-readable description of the violation"
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
      comment: "Severity level of the violation"
    }
  }],

  // Technical Issues
  technicalIssues: [{
    type: {
      type: String,
      comment: "Type of technical issue encountered"
    },
    timestamp: {
      type: Date,
      comment: "When the issue occurred"
    },
    description: {
      type: String,
      comment: "Description of the technical issue"
    },
    resolved: {
      type: Boolean,
      default: false,
      comment: "Whether the issue has been resolved"
    }
  }],

  // Environment Information
  environment: {
    userAgent: {
      type: String,
      comment: "User agent string from the browser"
    },
    screenResolution: {
      type: String,
      comment: "Screen resolution of the user's device"
    },
    browser: {
      type: String,
      comment: "Browser name and version"
    },
    os: {
      type: String,
      comment: "Operating system information"
    }
  },

  // Metadata
  metadata: {
    ipAddress: {
      type: String,
      comment: "IP address of the user"
    },
    location: {
      type: String,
      comment: "Geographic location of the user"
    },
    timezone: {
      type: String,
      comment: "Timezone of the user"
    }
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

/**
 * Database Indexes
 * 
 * Creates indexes for efficient querying:
 * - userId + status: For user-specific session queries
 * - sessionId: For unique session lookups
 * - assessmentId: For assessment-related queries
 */
proctoringSessionSchema.index({ userId: 1, status: 1 });
proctoringSessionSchema.index({ sessionId: 1 });
proctoringSessionSchema.index({ assessmentId: 1 });

// Export the ProctoringSession model
module.exports = mongoose.model("ProctoringSession", proctoringSessionSchema);
