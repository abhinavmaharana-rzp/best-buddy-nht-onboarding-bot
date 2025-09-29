const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  taskTitle: {
    type: String,
    required: true,
  },
  weekIndex: {
    type: Number,
    required: true,
  },
  dayIndex: {
    type: Number,
    required: true,
  },
  taskIndex: {
    type: Number,
    required: true,
  },
  googleFormUrl: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "in_progress", "completed", "failed"],
    default: "pending",
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
  },
  passingScore: {
    type: Number,
    default: 80,
  },
  passed: {
    type: Boolean,
    default: false,
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  proctoringData: {
    sessionId: String,
    recordingUrl: String,
    violations: [{
      type: String,
      timestamp: Date,
      description: String,
    }],
    screenRecording: {
      startTime: Date,
      endTime: Date,
      fileUrl: String,
    },
  },
  attemptCount: {
    type: Number,
    default: 0,
  },
  maxAttempts: {
    type: Number,
    default: 3,
  },
  feedback: {
    type: String,
  },
  createdBy: {
    type: String,
    required: false,
    default: "system",
  },
}, {
  timestamps: true,
});

// Compound index for user and task
assessmentSchema.index(
  { userId: 1, weekIndex: 1, dayIndex: 1, taskIndex: 1 },
  { unique: true }
);

module.exports = mongoose.model("Assessment", assessmentSchema);
