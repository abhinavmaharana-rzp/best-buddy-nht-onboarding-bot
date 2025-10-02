/**
 * Checklist Item Model
 * 
 * This model represents individual checklist items that new hires need to complete
 * during their onboarding process. It tracks the completion status of each task
 * for each user, providing a simple way to manage onboarding checklists.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Checklist Item Schema Definition
 * 
 * Defines the structure for storing checklist item data including:
 * - Task description and completion status
 * - User association for tracking individual progress
 */
const checklistItemSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true,
    comment: "Description of the checklist task to be completed"
  },
  completed: {
    type: Boolean,
    default: false,
    comment: "Whether the task has been completed by the user"
  },
  userId: {
    type: String,
    required: true,
    comment: "Slack user ID of the person assigned to this task"
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Export the ChecklistItem model
module.exports = mongoose.model("ChecklistItem", checklistItemSchema);
