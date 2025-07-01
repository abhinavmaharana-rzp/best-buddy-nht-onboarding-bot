// models/userProgress.js
const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  eventTitle: {
    // Changed from taskId to eventTitle
    type: String,
    required: true,
  },
  completed: {
    type: Boolean,
    default: false,
  },
});

mongoose.model("UserProgress", userProgressSchema);
