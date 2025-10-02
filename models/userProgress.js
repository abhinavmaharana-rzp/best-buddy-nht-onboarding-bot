/**
 * User Progress Model
 * 
 * This model tracks the gamification and progress data for each user in the onboarding system.
 * It includes points, levels, badges, streaks, and performance metrics to create an engaging
 * learning experience.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const mongoose = require("mongoose");

/**
 * User Progress Schema Definition
 * 
 * Defines the structure for storing user progress and gamification data including:
 * - User identification and basic info
 * - Progress tracking and current status
 * - Gamification elements (points, levels, badges)
 * - Performance metrics and social engagement
 */
const userProgressSchema = new mongoose.Schema({
  // User Identification
  userId: {
    type: String,
    required: true,
    unique: true,
    comment: "Unique Slack user ID"
  },
  userName: {
    type: String,
    required: true,
    comment: "Display name of the user"
  },
  email: {
    type: String,
    required: true,
    comment: "Email address of the user"
  },
  function: {
    type: String,
    required: true,
    comment: "Primary function/department (e.g., Engineering, Sales)"
  },
  subFunction: {
    type: String,
    required: true,
    comment: "Specific role within the function (e.g., Backend, Frontend)"
  },
  startDate: {
    type: Date,
    required: true,
    comment: "When the user started their onboarding journey"
  },

  // Progress Tracking
  currentWeek: {
    type: Number,
    default: 1,
    comment: "Current week in the onboarding plan (1-4)"
  },
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
    comment: "Overall completion percentage (0-100)"
  },

  // Gamification Elements
  points: {
    type: Number,
    default: 0,
    comment: "Total points earned by the user"
  },
  level: {
    type: String,
    default: "Rookie",
    enum: ["Rookie", "Explorer", "Achiever", "Expert", "Master", "Legend"],
    comment: "Current gamification level based on points earned"
  },
  // Badges and Achievements
  badges: [{
    name: {
      type: String,
      comment: "Name of the badge earned"
    },
    description: {
      type: String,
      comment: "Description of what the badge represents"
    },
    earnedAt: {
      type: Date,
      comment: "When the badge was earned"
    },
    category: {
      type: String,
      comment: "Category of badge: learning, assessment, social, milestone"
    },
    icon: {
      type: String,
      comment: "Emoji or icon representing the badge"
    }
  }],

  // Streak Tracking
  streaks: {
    current: {
      type: Number,
      default: 0,
      comment: "Current consecutive days of activity"
    },
    longest: {
      type: Number,
      default: 0,
      comment: "Longest streak achieved"
    },
    lastActivity: {
      type: Date,
      comment: "Date of last recorded activity"
    }
  },

  // Achievement Tracking
  achievements: [{
    name: {
      type: String,
      comment: "Name of the achievement"
    },
    description: {
      type: String,
      comment: "Description of the achievement"
    },
    earnedAt: {
      type: Date,
      comment: "When the achievement was earned"
    },
    points: {
      type: Number,
      comment: "Points awarded for this achievement"
    },
    category: {
      type: String,
      comment: "Category of the achievement"
    }
  }],

  // Weekly Goals System
  weeklyGoals: [{
    week: {
      type: Number,
      comment: "Week number (1-4)"
    },
    goals: [{
      name: {
        type: String,
        comment: "Name of the goal"
      },
      description: {
        type: String,
        comment: "Description of what needs to be accomplished"
      },
      completed: {
        type: Boolean,
        comment: "Whether the goal has been completed"
      },
      completedAt: {
        type: Date,
        comment: "When the goal was completed"
      },
      points: {
        type: Number,
        comment: "Points awarded for completing this goal"
      }
    }],
    completed: {
      type: Boolean,
      comment: "Whether all goals for the week are completed"
    },
    completedAt: {
      type: Date,
      comment: "When the week was completed"
    }
  }],

  // Social Engagement Metrics
  socialActivity: {
    questionsAsked: {
      type: Number,
      default: 0,
      comment: "Number of questions asked in channels"
    },
    answersProvided: {
      type: Number,
      default: 0,
      comment: "Number of helpful answers provided"
    },
    peerInteractions: {
      type: Number,
      default: 0,
      comment: "Number of interactions with peers"
    },
    mentorSessions: {
      type: Number,
      default: 0,
      comment: "Number of mentor sessions attended"
    }
  },

  // Learning Path and Personalization
  learningPath: {
    currentModule: {
      type: String,
      comment: "Currently active learning module"
    },
    completedModules: [{
      type: String,
      comment: "List of completed module IDs"
    }],
    recommendedModules: [{
      type: String,
      comment: "List of recommended module IDs based on progress"
    }],
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
      comment: "Current difficulty level of content"
    }
  },

  // Performance Metrics
  performance: {
    averageAssessmentScore: {
      type: Number,
      default: 0,
      comment: "Average score across all assessments"
    },
    totalAssessments: {
      type: Number,
      default: 0,
      comment: "Total number of assessments taken"
    },
    passedAssessments: {
      type: Number,
      default: 0,
      comment: "Number of assessments passed"
    },
    averageTaskCompletionTime: {
      type: Number,
      default: 0,
      comment: "Average time to complete tasks (in minutes)"
    }
  },

  // User Preferences
  preferences: {
    notificationFrequency: {
      type: String,
      enum: ["immediate", "daily", "weekly"],
      default: "daily",
      comment: "How often to send notifications"
    },
    learningStyle: {
      type: String,
      enum: ["visual", "auditory", "kinesthetic", "reading"],
      default: "reading",
      comment: "Preferred learning style"
    },
    preferredTime: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      default: "morning",
      comment: "Preferred time of day for learning"
    }
  },

  // Activity and Status Tracking
  lastActive: {
    type: Date,
    default: Date.now,
    comment: "Last time the user was active in the system"
  },
  status: {
    type: String,
    enum: ["active", "paused", "completed", "dropped"],
    default: "active",
    comment: "Current status of the user's onboarding journey"
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt fields
});

/**
 * Database Indexes
 * 
 * Creates indexes for efficient querying:
 * - userId: For user-specific queries
 * - level: For leaderboard and level-based queries
 * - overallProgress: For progress-based filtering
 * - points: For leaderboard sorting (descending)
 * - lastActive: For activity-based queries
 */
userProgressSchema.index({ userId: 1 });
userProgressSchema.index({ level: 1 });
userProgressSchema.index({ overallProgress: 1 });
userProgressSchema.index({ points: -1 });
userProgressSchema.index({ lastActive: -1 });

/**
 * Virtual Properties
 * 
 * Calculates the user's level based on their current points.
 * This is a computed property that doesn't exist in the database
 * but is calculated on-the-fly when accessed.
 */
userProgressSchema.virtual("calculatedLevel").get(function() {
  const points = this.points;
  if (points >= 1000) return "Legend";
  if (points >= 750) return "Master";
  if (points >= 500) return "Expert";
  if (points >= 250) return "Achiever";
  if (points >= 100) return "Explorer";
  return "Rookie";
});

/**
 * Instance Methods
 * 
 * These methods are available on each UserProgress document instance
 * and provide functionality for managing user progress and gamification.
 */

/**
 * Add Points and Update Level
 * 
 * Adds points to the user's total and automatically updates their level.
 * Also creates an achievement record for significant point milestones.
 * 
 * @param {number} points - Number of points to add
 * @param {string} reason - Reason for earning the points
 * @returns {Promise} - Promise that resolves when the document is saved
 */
userProgressSchema.methods.addPoints = function(points, reason) {
  this.points += points;
  this.level = this.calculatedLevel;
  
  // Add achievement if significant milestone (50+ points)
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

/**
 * Add Badge
 * 
 * Adds a new badge to the user's collection if they don't already have it.
 * Prevents duplicate badges from being added.
 * 
 * @param {Object} badge - Badge object with name, description, category, icon
 * @returns {Promise} - Promise that resolves when the document is saved
 */
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

/**
 * Update Streak
 * 
 * Updates the user's activity streak based on their last activity date.
 * Handles consecutive days, broken streaks, and first-time activity.
 * 
 * @returns {Promise} - Promise that resolves when the document is saved
 */
userProgressSchema.methods.updateStreak = function() {
  const now = new Date();
  const lastActivity = this.streaks.lastActivity;
  
  if (lastActivity) {
    const daysDiff = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      // Consecutive day - increment streak
      this.streaks.current += 1;
    } else if (daysDiff > 1) {
      // Streak broken - reset to 1
      this.streaks.current = 1;
    }
    // If daysDiff === 0, same day - don't change streak
  } else {
    // First activity - start streak at 1
    this.streaks.current = 1;
  }
  
  // Update last activity and longest streak
  this.streaks.lastActivity = now;
  this.streaks.longest = Math.max(this.streaks.longest, this.streaks.current);
  
  return this.save();
};

// Export the UserProgress model
module.exports = mongoose.model("UserProgress", userProgressSchema);