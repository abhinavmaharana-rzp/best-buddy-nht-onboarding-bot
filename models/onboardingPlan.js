// models/onboardingPlan.js
const mongoose = require('mongoose');

const onboardingPlanSchema = new mongoose.Schema({
  function: {
    type: String,
    required: true
  },
  subFunction: {
    type: String,
    required: true
  },
  tasks: [
    {
      id: {
        type: String,
        required: true
      },
      description: {
        type: String,
        required: true
      }
    }
  ]
});

mongoose.model('OnboardingPlan', onboardingPlanSchema);