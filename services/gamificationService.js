/**
 * Gamification Service
 * 
 * This service handles all gamification features including points, badges, levels,
 * streaks, leaderboards, and achievement tracking. It provides methods to award
 * points, manage user progress, and create engaging learning experiences.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const UserProgress = require("../models/userProgress");
const { App } = require("@slack/bolt");

/**
 * GamificationService Class
 * 
 * Manages all gamification functionality for the onboarding system.
 * Integrates with Slack for notifications and user interactions.
 */
class GamificationService {
  /**
   * Constructor
   * 
   * @param {App} slackApp - Slack Bolt app instance for sending messages
   */
  constructor(slackApp) {
    this.slackApp = slackApp;
  }

  /**
   * Initialize User Progress Tracking
   * 
   * Creates a new user progress record or returns existing one.
   * Sets up initial gamification data including weekly goals and default values.
   * 
   * @param {string} userId - Slack user ID
   * @param {Object} userData - User information (name, email, function, etc.)
   * @returns {Promise<Object>} User progress document
   */
  async initializeUserProgress(userId, userData) {
    try {
      const existingProgress = await UserProgress.findOne({ userId });
      if (existingProgress) {
        return existingProgress;
      }

      const userProgress = new UserProgress({
        userId,
        userName: userData.userName,
        email: userData.email,
        function: userData.function,
        subFunction: userData.subFunction,
        startDate: new Date(),
        weeklyGoals: this.generateWeeklyGoals(),
      });

      await userProgress.save();
      return userProgress;
    } catch (error) {
      console.error("Error initializing user progress:", error);
      throw error;
    }
  }

  /**
   * Award Points for Task Completion
   * 
   * Awards points, badges, and achievements based on the type of task completed.
   * Different task types have different point values and unlock different rewards.
   * 
   * @param {string} userId - Slack user ID
   * @param {string} taskType - Type of task (checklist_item, onboarding_task, assessment, etc.)
   * @param {Object} taskData - Additional task information
   * @returns {Promise<Object>} Updated user progress document
   */
  async awardTaskCompletion(userId, taskType, taskData) {
    try {
      const userProgress = await UserProgress.findOne({ userId });
      if (!userProgress) {
        throw new Error("User progress not found");
      }

      let points = 0;
      let badge = null;
      let achievement = null;

      switch (taskType) {
        case "checklist_item":
          points = 10;
          break;
        case "onboarding_task":
          points = 15;
          break;
        case "assessment_passed":
          points = 25;
          badge = {
            name: "Assessment Master",
            description: "Passed an assessment",
            category: "assessment",
            icon: "🎯",
          };
          break;
        case "assessment_perfect":
          points = 50;
          badge = {
            name: "Perfect Score",
            description: "Achieved 100% on an assessment",
            category: "assessment",
            icon: "💯",
          };
          break;
        case "first_week_complete":
          points = 100;
          badge = {
            name: "First Week Warrior",
            description: "Completed your first week",
            category: "milestone",
            icon: "🏆",
          };
          break;
        case "streak_7_days":
          points = 75;
          badge = {
            name: "Consistent Learner",
            description: "7-day learning streak",
            category: "learning",
            icon: "🔥",
          };
          break;
        case "complete_week":
          points = 200;
          badge = {
            name: "Week Champion",
            description: `Completed week ${taskData.week}`,
            category: "milestone",
            icon: "⭐",
          };
          break;
      }

      // Add points
      await userProgress.addPoints(points, `${taskType} completion`);

      // Add badge if earned
      if (badge) {
        await userProgress.addBadge(badge);
      }

      // Check for level up
      const newLevel = userProgress.calculatedLevel;
      if (newLevel !== userProgress.level) {
        await this.handleLevelUp(userId, newLevel);
      }

      // Update streak
      await userProgress.updateStreak();

      // Check for achievements
      await this.checkAchievements(userId);

      // Send notification
      await this.sendProgressNotification(userId, taskType, points, badge);

      return userProgress;
    } catch (error) {
      console.error("Error awarding task completion:", error);
      throw error;
    }
  }

  /**
   * Handle level up
   * @param {string} userId - User ID
   * @param {string} newLevel - New level
   */
  async handleLevelUp(userId, newLevel) {
    try {
      const userProgress = await UserProgress.findOne({ userId });
      if (!userProgress) return;

      userProgress.level = newLevel;
      await userProgress.save();

      // Send level up notification
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        text: `🎉 Level Up! You're now a ${newLevel}!`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🎉 Level Up!",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `Congratulations! You've reached the *${newLevel}* level!\n\nYour dedication to learning is impressive. Keep up the great work!`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Current Stats:*\n• Level: ${newLevel}\n• Points: ${userProgress.points}\n• Streak: ${userProgress.streaks.current} days`,
            },
          },
        ],
      });
    } catch (error) {
      console.error("Error handling level up:", error);
    }
  }

  /**
   * Check for achievements
   * @param {string} userId - User ID
   */
  async checkAchievements(userId) {
    try {
      const userProgress = await UserProgress.findOne({ userId });
      if (!userProgress) return;

      const achievements = [];

      // First assessment passed
      if (userProgress.performance.passedAssessments === 1) {
        achievements.push({
          name: "First Assessment",
          description: "Passed your first assessment",
          points: 50,
          category: "milestone",
        });
      }

      // Perfect week (all tasks completed)
      if (userProgress.overallProgress >= 100) {
        achievements.push({
          name: "Perfect Week",
          description: "Completed all tasks in a week",
          points: 100,
          category: "milestone",
        });
      }


      // Add new achievements
      for (const achievement of achievements) {
        const existing = userProgress.achievements.find(a => a.name === achievement.name);
        if (!existing) {
          userProgress.achievements.push({
            ...achievement,
            earnedAt: new Date(),
          });
        }
      }

      await userProgress.save();
    } catch (error) {
      console.error("Error checking achievements:", error);
    }
  }

  /**
   * Send progress notification
   * @param {string} userId - User ID
   * @param {string} taskType - Task type
   * @param {number} points - Points earned
   * @param {Object} badge - Badge earned
   */
  async sendProgressNotification(userId, taskType, points, badge) {
    try {
      const userProgress = await UserProgress.findOne({ userId });
      if (!userProgress) return;

      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🎉 Great job! You earned *${points} points* for completing a ${taskType.replace(/_/g, ' ')}!`,
          },
        },
      ];

      if (badge) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🏆 *New Badge Earned!*\n${badge.icon} *${badge.name}*\n${badge.description}`,
          },
        });
      }

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Your Progress:*\n• Level: ${userProgress.level}\n• Points: ${userProgress.points}\n• Streak: ${userProgress.streaks.current} days`,
        },
      });

      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        text: `🎉 Points earned! +${points}`,
        blocks,
      });
    } catch (error) {
      console.error("Error sending progress notification:", error);
    }
  }

  /**
   * Generate weekly goals
   * @returns {Array} Weekly goals
   */
  generateWeeklyGoals() {
    const goals = [];
    
    for (let week = 1; week <= 4; week++) {
      const weekGoals = [
        {
          name: `Complete Week ${week} Tasks`,
          description: `Finish all tasks for week ${week}`,
          completed: false,
          points: 50,
        },
        {
          name: `Pass Week ${week} Assessments`,
          description: `Pass all assessments for week ${week}`,
          completed: false,
          points: 75,
        },
        {
          name: `Maintain Learning Streak`,
          description: "Stay active for 5 consecutive days",
          completed: false,
          points: 25,
        },
      ];


      goals.push({
        week,
        goals: weekGoals,
        completed: false,
      });
    }

    return goals;
  }

  /**
   * Get Leaderboard
   * 
   * Retrieves a ranked list of users based on different criteria.
   * Supports multiple categories like points, streaks, progress, and assessments.
   * 
   * @param {string} category - Leaderboard category (points, streak, progress, assessments)
   * @param {number} limit - Maximum number of results to return
   * @returns {Promise<Array>} Array of user progress documents sorted by criteria
   */
  async getLeaderboard(category = "points", limit = 10) {
    try {
      let sortCriteria = {};
      
      switch (category) {
        case "points":
          sortCriteria = { points: -1 };
          break;
        case "streak":
          sortCriteria = { "streaks.current": -1 };
          break;
        case "progress":
          sortCriteria = { overallProgress: -1 };
          break;
        case "assessments":
          sortCriteria = { "performance.passedAssessments": -1 };
          break;
        default:
          sortCriteria = { points: -1 };
      }

      const leaderboard = await UserProgress.find({ status: "active" })
        .sort(sortCriteria)
        .limit(limit)
        .select("userName points level streaks.current overallProgress performance.passedAssessments");

      return leaderboard.map((user, index) => ({
        rank: index + 1,
        userName: user.userName,
        points: user.points,
        level: user.level,
        streak: user.streaks.current,
        progress: user.overallProgress,
        assessments: user.performance.passedAssessments,
      }));
    } catch (error) {
      console.error("Error getting leaderboard:", error);
      return [];
    }
  }

  /**
   * Send weekly leaderboard
   * @param {string} channel - Channel to send to
   */
  async sendWeeklyLeaderboard(channel) {
    try {
      const leaderboard = await this.getLeaderboard("points", 10);
      
      if (leaderboard.length === 0) {
        return;
      }

      const blocks = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🏆 Weekly Leaderboard",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Top performers this week:*",
          },
        },
      ];

      leaderboard.forEach((user, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${medal} *${user.userName}* (${user.level})\n• Points: ${user.points}\n• Streak: ${user.streak} days\n• Progress: ${user.progress}%`,
          },
        });
      });

      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel,
        text: "🏆 Weekly Leaderboard",
        blocks,
      });
    } catch (error) {
      console.error("Error sending weekly leaderboard:", error);
    }
  }

  /**
   * Get user progress summary
   * @param {string} userId - User ID
   * @returns {Object} Progress summary
   */
  async getUserProgressSummary(userId) {
    try {
      const userProgress = await UserProgress.findOne({ userId });
      if (!userProgress) {
        return null;
      }

      return {
        userName: userProgress.userName,
        level: userProgress.level,
        points: userProgress.points,
        overallProgress: userProgress.overallProgress,
        streak: userProgress.streaks.current,
        longestStreak: userProgress.streaks.longest,
        badges: userProgress.badges.length,
        achievements: userProgress.achievements.length,
        nextLevelPoints: this.getNextLevelPoints(userProgress.points),
        recentBadges: userProgress.badges.slice(-3),
        recentAchievements: userProgress.achievements.slice(-3),
      };
    } catch (error) {
      console.error("Error getting user progress summary:", error);
      return null;
    }
  }

  /**
   * Get points needed for next level
   * @param {number} currentPoints - Current points
   * @returns {number} Points needed for next level
   */
  getNextLevelPoints(currentPoints) {
    const levels = [0, 100, 250, 500, 750, 1000];
    const currentLevel = levels.findIndex(level => currentPoints < level);
    
    // If at max level, return 0
    if (currentLevel === -1) {
      return 0;
    }
    
    return levels[currentLevel] - currentPoints;
  }
}

module.exports = GamificationService;
