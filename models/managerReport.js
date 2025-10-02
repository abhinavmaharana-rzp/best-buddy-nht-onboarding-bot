/**
 * Manager Report Model
 * 
 * This model stores comprehensive reports generated for managers about their
 * team's onboarding progress. It includes detailed metrics, assessments,
 * performance data, and recommendations for each new hire.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Manager Report Schema Definition
 * 
 * Defines the structure for storing manager report data including:
 * - Manager identification and report metadata
 * - Detailed new hire progress and performance data
 * - Summary statistics and recommendations
 * - Report status and delivery tracking
 */
const managerReportSchema = new mongoose.Schema({
  // Report Identification
  managerId: {
    type: String,
    required: true,
    index: true,
    comment: "Slack user ID of the manager receiving this report"
  },
  reportDate: {
    type: Date,
    required: true,
    index: true,
    comment: "Date when the report was generated"
  },
  reportType: {
    type: String,
    enum: ["weekly", "biweekly", "monthly"],
    default: "weekly",
    comment: "Frequency of the report (weekly, biweekly, monthly)"
  },
  // Report Period
  period: {
    startDate: {
      type: Date,
      comment: "Start date of the reporting period"
    },
    endDate: {
      type: Date,
      comment: "End date of the reporting period"
    }
  },

  // New Hire Data
  newHires: [{
    userId: {
      type: String,
      comment: "Slack user ID of the new hire"
    },
    userName: {
      type: String,
      comment: "Display name of the new hire"
    },
    email: {
      type: String,
      comment: "Email address of the new hire"
    },
    function: {
      type: String,
      comment: "Primary function/department"
    },
    subFunction: {
      type: String,
      comment: "Specific role within the function"
    },
    startDate: {
      type: Date,
      comment: "When the new hire started their onboarding"
    },
    progress: {
      overallPercentage: {
        type: Number,
        comment: "Overall completion percentage (0-100)"
      },
      tasksCompleted: {
        type: Number,
        comment: "Number of tasks completed"
      },
      totalTasks: {
        type: Number,
        comment: "Total number of tasks assigned"
      },
      assessmentsCompleted: {
        type: Number,
        comment: "Number of assessments completed"
      },
      totalAssessments: {
        type: Number,
        comment: "Total number of assessments assigned"
      },
      averageScore: {
        type: Number,
        comment: "Average score across all assessments"
      }
    },
    assessments: [{
      taskTitle: {
        type: String,
        comment: "Title of the assessment task"
      },
      score: {
        type: Number,
        comment: "Score achieved on the assessment"
      },
      passed: {
        type: Boolean,
        comment: "Whether the assessment was passed"
      },
      completedAt: {
        type: Date,
        comment: "When the assessment was completed"
      },
      attemptCount: {
        type: Number,
        comment: "Number of attempts made"
      }
    }],
    recentActivity: [{
      type: {
        type: String,
        comment: "Type of activity (task_completed, assessment_passed, etc.)"
      },
      description: {
        type: String,
        comment: "Description of the activity"
      },
      timestamp: {
        type: Date,
        comment: "When the activity occurred"
      }
    }],
    milestones: [{
      name: {
        type: String,
        comment: "Name of the milestone"
      },
      achieved: {
        type: Boolean,
        comment: "Whether the milestone has been achieved"
      },
      achievedAt: {
        type: Date,
        comment: "When the milestone was achieved"
      }
    }],
    concerns: [{
      type: {
        type: String,
        comment: "Type of concern (low_performance, multiple_failures, inactive, etc.)"
      },
      description: {
        type: String,
        comment: "Description of the concern"
      },
      severity: {
        type: String,
        comment: "Severity level (low, medium, high)"
      },
      timestamp: {
        type: Date,
        comment: "When the concern was identified"
      }
    }]
  }],
  // Summary Statistics
  summary: {
    totalNewHires: {
      type: Number,
      comment: "Total number of new hires in this report"
    },
    averageProgress: {
      type: Number,
      comment: "Average progress percentage across all new hires"
    },
    assessmentsPassed: {
      type: Number,
      comment: "Total number of assessments passed"
    },
    assessmentsFailed: {
      type: Number,
      comment: "Total number of assessments failed"
    },
    topPerformers: [{
      type: String,
      comment: "User IDs of top performing new hires"
    }],
    needsAttention: [{
      type: String,
      comment: "User IDs of new hires who need attention"
    }],
    overallHealth: {
      type: String,
      comment: "Overall team health status (excellent, good, fair, poor)"
    }
  },

  // Recommendations
  recommendations: [{
    type: {
      type: String,
      comment: "Type of recommendation (intervention_needed, additional_training, recognition, etc.)"
    },
    description: {
      type: String,
      comment: "Detailed description of the recommendation"
    },
    priority: {
      type: String,
      comment: "Priority level (low, medium, high)"
    },
    targetUsers: [{
      type: String,
      comment: "User IDs of users this recommendation applies to"
    }]
  }],

  // Delivery Tracking
  sentAt: {
    type: Date,
    comment: "When the report was sent to the manager"
  },
  status: {
    type: String,
    enum: ["draft", "sent", "failed"],
    default: "draft",
    comment: "Current status of the report"
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

/**
 * Database Indexes
 * 
 * Creates compound indexes for efficient querying:
 * - managerId + reportDate: For manager-specific reports
 * - reportDate + status: For status-based queries
 */
managerReportSchema.index({ managerId: 1, reportDate: 1 });
managerReportSchema.index({ reportDate: 1, status: 1 });

// Export the ManagerReport model
module.exports = mongoose.model("ManagerReport", managerReportSchema);
