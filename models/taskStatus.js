// models/taskStatus.js
const mongoose = require("mongoose");

const taskStatusSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Slack User ID
  weekIndex: { type: Number, required: true },
  dayIndex: { type: Number, required: true },
  taskIndex: { type: Number, required: true },
  completed: { type: Boolean, default: false },
});

module.exports = mongoose.model("TaskStatus", taskStatusSchema);
