/**
 * Task Approval Model
 * 
 * This model tracks task approval requests and their review status.
 * It manages the workflow where users request approval for completed tasks
 * and managers or administrators review and approve/reject these requests.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Task Approval Schema Definition
 * 
 * Defines the structure for storing task approval data including:
 * - User and task identification
 * - Approval status and review information
 * - Slack message tracking for interactive approvals
 */
const taskApprovalSchema = new mongoose.Schema({
  // User and Task Identification
  userId: {
    type: String,
    required: true,
    index: true,
    comment: "Slack user ID of the person requesting approval"
  },
  taskTitle: {
    type: String,
    required: true,
    comment: "Title of the task being approved"
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

  // Approval Status
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
    comment: "Current approval status of the task"
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    comment: "When the approval was requested"
  },
  reviewedAt: {
    type: Date,
    comment: "When the approval was reviewed"
  },
  reviewedBy: {
    type: String,
    comment: "Slack user ID of the person who reviewed the approval"
  },

  // Slack Integration
  messageTs: {
    type: String,
    required: true,
    comment: "Slack message timestamp for interactive approval buttons"
  },
  channelId: {
    type: String,
    required: true,
    comment: "Slack channel ID where the approval request was posted"
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

/**
 * Database Indexes
 * 
 * Creates compound indexes for efficient querying:
 * - Unique index on user + task combination to prevent duplicate approvals
 * - Individual index on userId for user-specific queries
 */
taskApprovalSchema.index(
  { userId: 1, weekIndex: 1, dayIndex: 1, taskIndex: 1 },
  { unique: true, comment: "Ensures one approval request per user per task" }
);

// Export the TaskApproval model
module.exports = mongoose.model("TaskApproval", taskApprovalSchema);
