const mongoose = require("mongoose");

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  function: {
    type: String,
    required: true,
  },
  subFunction: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  currentWeek: {
    type: Number,
    default: 1,
  },
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  points: {
    type: Number,
    default: 0,
  },
  level: {
    type: String,
    default: "Rookie",
    enum: ["Rookie", "Explorer", "Achiever", "Expert", "Master", "Legend"],
  },
  badges: [{
    name: String,
    description: String,
    earnedAt: Date,
    category: String, // learning, assessment, social, milestone
    icon: String,
  }],
  streaks: {
    current: {
      type: Number,
      default: 0,
    },
    longest: {
      type: Number,
      default: 0,
    },
    lastActivity: Date,
  },
  achievements: [{
    name: String,
    description: String,
    earnedAt: Date,
    points: Number,
    category: String,
  }],
  weeklyGoals: [{
    week: Number,
    goals: [{
      name: String,
      description: String,
      completed: Boolean,
      completedAt: Date,
      points: Number,
    }],
    completed: Boolean,
    completedAt: Date,
  }],
  socialActivity: {
    questionsAsked: {
      type: Number,
      default: 0,
    },
    answersProvided: {
      type: Number,
      default: 0,
    },
    peerInteractions: {
      type: Number,
      default: 0,
    },
    mentorSessions: {
      type: Number,
      default: 0,
    },
  },
  learningPath: {
    currentModule: String,
    completedModules: [String],
    recommendedModules: [String],
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
  },
  performance: {
    averageAssessmentScore: {
      type: Number,
      default: 0,
    },
    totalAssessments: {
      type: Number,
      default: 0,
    },
    passedAssessments: {
      type: Number,
      default: 0,
    },
    averageTaskCompletionTime: {
      type: Number,
      default: 0,
    },
  },
  preferences: {
    notificationFrequency: {
      type: String,
      enum: ["immediate", "daily", "weekly"],
      default: "daily",
    },
    learningStyle: {
      type: String,
      enum: ["visual", "auditory", "kinesthetic", "reading"],
      default: "reading",
    },
    preferredTime: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      default: "morning",
    },
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["active", "paused", "completed", "dropped"],
    default: "active",
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
userProgressSchema.index({ userId: 1 });
userProgressSchema.index({ level: 1 });
userProgressSchema.index({ overallProgress: 1 });
userProgressSchema.index({ points: -1 });
userProgressSchema.index({ lastActive: -1 });

// Virtual for calculating level based on points
userProgressSchema.virtual("calculatedLevel").get(function() {
  const points = this.points;
  if (points >= 1000) return "Legend";
  if (points >= 750) return "Master";
  if (points >= 500) return "Expert";
  if (points >= 250) return "Achiever";
  if (points >= 100) return "Explorer";
  return "Rookie";
});

// Method to add points and update level
userProgressSchema.methods.addPoints = function(points, reason) {
  this.points += points;
  this.level = this.calculatedLevel;
  
  // Add achievement if significant milestone
  if (points >= 50) {
    this.achievements.push({
      name: `Earned ${points} points`,
      description: reason || "Points earned for activity",
      earnedAt: new Date(),
      points: points,
      category: "points",
    });
  }
  
  return this.save();
};

// Method to add badge
userProgressSchema.methods.addBadge = function(badge) {
  const existingBadge = this.badges.find(b => b.name === badge.name);
  if (!existingBadge) {
    this.badges.push({
      ...badge,
      earnedAt: new Date(),
    });
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to update streak
userProgressSchema.methods.updateStreak = function() {
  const now = new Date();
  const lastActivity = this.streaks.lastActivity;
  
  if (lastActivity) {
    const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day
      this.streaks.current += 1;
    } else if (daysDiff > 1) {
      // Streak broken
      this.streaks.current = 1;
    }
    // If daysDiff === 0, same day, don't change streak
  } else {
    // First activity
    this.streaks.current = 1;
  }
  
  this.streaks.lastActivity = now;
  this.streaks.longest = Math.max(this.streaks.longest, this.streaks.current);
  
  return this.save();
};

module.exports = mongoose.model("UserProgress", userProgressSchema);