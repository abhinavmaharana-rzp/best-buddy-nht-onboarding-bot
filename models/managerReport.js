const mongoose = require("mongoose");

const managerReportSchema = new mongoose.Schema({
  managerId: {
    type: String,
    required: true,
    index: true,
  },
  reportDate: {
    type: Date,
    required: true,
    index: true,
  },
  reportType: {
    type: String,
    enum: ["weekly", "biweekly", "monthly"],
    default: "weekly",
  },
  period: {
    startDate: Date,
    endDate: Date,
  },
  newHires: [{
    userId: String,
    userName: String,
    email: String,
    function: String,
    subFunction: String,
    startDate: Date,
    progress: {
      overallPercentage: Number,
      tasksCompleted: Number,
      totalTasks: Number,
      assessmentsCompleted: Number,
      totalAssessments: Number,
      averageScore: Number,
    },
    assessments: [{
      taskTitle: String,
      score: Number,
      passed: Boolean,
      completedAt: Date,
      attemptCount: Number,
    }],
    recentActivity: [{
      type: String, // task_completed, assessment_passed, assessment_failed, etc.
      description: String,
      timestamp: Date,
    }],
    milestones: [{
      name: String,
      achieved: Boolean,
      achievedAt: Date,
    }],
    concerns: [{
      type: String, // low_performance, multiple_failures, inactive, etc.
      description: String,
      severity: String, // low, medium, high
      timestamp: Date,
    }],
  }],
  summary: {
    totalNewHires: Number,
    averageProgress: Number,
    assessmentsPassed: Number,
    assessmentsFailed: Number,
    topPerformers: [String], // userIds
    needsAttention: [String], // userIds
    overallHealth: String, // excellent, good, fair, poor
  },
  recommendations: [{
    type: String, // intervention_needed, additional_training, recognition, etc.
    description: String,
    priority: String, // low, medium, high
    targetUsers: [String], // userIds
  }],
  sentAt: Date,
  status: {
    type: String,
    enum: ["draft", "sent", "failed"],
    default: "draft",
  },
}, {
  timestamps: true,
});

// Compound index for efficient queries
managerReportSchema.index({ managerId: 1, reportDate: 1 });
managerReportSchema.index({ reportDate: 1, status: 1 });

module.exports = mongoose.model("ManagerReport", managerReportSchema);
