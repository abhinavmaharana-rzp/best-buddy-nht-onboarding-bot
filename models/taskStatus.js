/**
 * Task Status Model
 * 
 * This model tracks the completion status of individual onboarding tasks
 * for each user. It provides a simple way to track which tasks have been
 * completed across the structured onboarding plan.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Task Status Schema Definition
 * 
 * Defines the structure for storing task completion status including:
 * - User identification and task location
 * - Completion status tracking
 * - Simple boolean flag for task completion
 */
const taskStatusSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    comment: "Slack user ID of the person assigned to this task"
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
  completed: {
    type: Boolean,
    default: false,
    comment: "Whether the task has been completed by the user"
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Export the TaskStatus model
module.exports = mongoose.model("TaskStatus", taskStatusSchema);
