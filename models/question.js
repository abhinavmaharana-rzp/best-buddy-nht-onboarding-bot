/**
 * Question Model
 * 
 * This model stores questions for assessments with support for tagging,
 * difficulty levels, and versioning for better question bank management.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * Question Schema Definition
 */
const questionSchema = new mongoose.Schema({
  // Question Content
  question: {
    type: String,
    required: true,
    comment: "The question text"
  },
  options: [{
    type: String,
    required: true,
    comment: "Multiple choice options"
  }],
  correctAnswer: {
    type: String,
    required: true,
    comment: "The correct answer"
  },
  explanation: {
    type: String,
    comment: "Explanation of why this is the correct answer"
  },

  // Categorization
  assessment: {
    type: String,
    required: true,
    index: true,
    comment: "Which assessment this question belongs to (e.g., 'Fintech 101')"
  },
  topic: {
    type: String,
    comment: "Specific topic/subtopic (e.g., 'Payment Ecosystem', 'UPI')"
  },
  tags: [{
    type: String,
    comment: "Tags for searchability (e.g., 'NPCI', 'card-networks', 'regulations')"
  }],

  // Difficulty and Metadata
  difficulty: {
    type: String,
    enum: ["easy", "medium", "hard"],
    default: "medium",
    comment: "Difficulty level of the question"
  },
  points: {
    type: Number,
    default: 1,
    comment: "Points awarded for correct answer"
  },

  // Analytics
  statistics: {
    timesUsed: {
      type: Number,
      default: 0,
      comment: "How many times this question has been used in assessments"
    },
    correctAnswers: {
      type: Number,
      default: 0,
      comment: "Number of times answered correctly"
    },
    incorrectAnswers: {
      type: Number,
      default: 0,
      comment: "Number of times answered incorrectly"
    },
    averageTime: {
      type: Number,
      default: 0,
      comment: "Average time spent on this question (in seconds)"
    }
  },

  // Version Control
  version: {
    type: Number,
    default: 1,
    comment: "Version number for tracking question changes"
  },
  previousVersions: [{
    version: Number,
    question: String,
    options: [String],
    correctAnswer: String,
    explanation: String,
    modifiedAt: Date,
    modifiedBy: String
  }],

  // Status
  status: {
    type: String,
    enum: ["active", "draft", "archived", "review"],
    default: "active",
    comment: "Status of the question"
  },
  
  // Audit Fields
  createdBy: {
    type: String,
    default: "system",
    comment: "Who created this question"
  },
  lastModifiedBy: {
    type: String,
    comment: "Who last modified this question"
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

/**
 * Indexes for efficient querying
 */
questionSchema.index({ assessment: 1, status: 1 });
questionSchema.index({ difficulty: 1 });
questionSchema.index({ tags: 1 });
questionSchema.index({ topic: 1 });

/**
 * Virtual property to calculate success rate
 */
questionSchema.virtual("successRate").get(function() {
  const total = this.statistics.correctAnswers + this.statistics.incorrectAnswers;
  if (total === 0) return 0;
  return Math.round((this.statistics.correctAnswers / total) * 100);
});

/**
 * Instance Methods
 */

/**
 * Record an answer for analytics
 */
questionSchema.methods.recordAnswer = function(isCorrect, timeSpent) {
  this.statistics.timesUsed += 1;
  
  if (isCorrect) {
    this.statistics.correctAnswers += 1;
  } else {
    this.statistics.incorrectAnswers += 1;
  }
  
  // Update average time (weighted average)
  const totalAnswers = this.statistics.correctAnswers + this.statistics.incorrectAnswers;
  this.statistics.averageTime = 
    ((this.statistics.averageTime * (totalAnswers - 1)) + timeSpent) / totalAnswers;
  
  return this.save();
};

/**
 * Create a new version (before updating)
 */
questionSchema.methods.createVersion = function(modifiedBy) {
  this.previousVersions.push({
    version: this.version,
    question: this.question,
    options: [...this.options],
    correctAnswer: this.correctAnswer,
    explanation: this.explanation,
    modifiedAt: new Date(),
    modifiedBy: modifiedBy
  });
  
  this.version += 1;
  this.lastModifiedBy = modifiedBy;
  
  return this;
};

// Export the Question model
module.exports = mongoose.model("Question", questionSchema);

