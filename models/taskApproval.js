const mongoose = require("mongoose");

const taskApprovalSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  reviewedBy: {
    type: String,
  },
  messageTs: {
    type: String,
    required: true,
  },
  channelId: {
    type: String,
    required: true,
  },
});

// Compound index for user and task
taskApprovalSchema.index(
  { userId: 1, weekIndex: 1, dayIndex: 1, taskIndex: 1 },
  { unique: true },
);

module.exports = mongoose.model("TaskApproval", taskApprovalSchema);
