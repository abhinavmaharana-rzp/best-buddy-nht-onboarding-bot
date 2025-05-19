// src/models/ChecklistItem.js
const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  task: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  userId: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('ChecklistItem', checklistItemSchema);