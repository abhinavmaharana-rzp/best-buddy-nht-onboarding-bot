const mongoose = require("mongoose");

const proctoringSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Assessment",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "completed", "terminated", "failed"],
    default: "active",
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
  },
  duration: {
    type: Number, // in seconds
  },
  screenRecording: {
    enabled: {
      type: Boolean,
      default: true,
    },
    fileUrl: String,
    startTime: Date,
    endTime: Date,
  },
  violations: [{
    type: {
      type: String,
      enum: ["tab_switch", "window_focus_loss", "copy_paste", "right_click", "keyboard_shortcut", "multiple_windows"],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    description: String,
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low",
    },
  }],
  technicalIssues: [{
    type: String,
    timestamp: Date,
    description: String,
    resolved: {
      type: Boolean,
      default: false,
    },
  }],
  environment: {
    userAgent: String,
    screenResolution: String,
    browser: String,
    os: String,
  },
  metadata: {
    ipAddress: String,
    location: String,
    timezone: String,
  },
}, {
  timestamps: true,
});

// Index for efficient queries
proctoringSessionSchema.index({ userId: 1, status: 1 });
proctoringSessionSchema.index({ sessionId: 1 });
proctoringSessionSchema.index({ assessmentId: 1 });

module.exports = mongoose.model("ProctoringSession", proctoringSessionSchema);
