/**
 * Onboarding Plan Model
 * 
 * This model defines the structured onboarding plans for different functions
 * and sub-functions within the organization. It contains the specific tasks
 * and activities that new hires need to complete based on their role.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Onboarding Plan Schema Definition
 * 
 * Defines the structure for storing onboarding plan data including:
 * - Function and sub-function identification
 * - Task definitions and descriptions
 * - Role-specific onboarding requirements
 */
const onboardingPlanSchema = new mongoose.Schema({
  function: {
    type: String,
    required: true,
    comment: "Primary function/department (e.g., Engineering, Sales, Marketing)"
  },
  subFunction: {
    type: String,
    required: true,
    comment: "Specific role within the function (e.g., Backend, Frontend, SDR)"
  },
  tasks: [{
    id: {
      type: String,
      required: true,
      comment: "Unique identifier for the task"
    },
    description: {
      type: String,
      required: true,
      comment: "Detailed description of what needs to be accomplished"
    }
  }]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

// Export the OnboardingPlan model
module.exports = mongoose.model("OnboardingPlan", onboardingPlanSchema);
