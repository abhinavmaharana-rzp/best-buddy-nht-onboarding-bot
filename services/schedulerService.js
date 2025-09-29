const cron = require("node-cron");
const ReportingService = require("./reportingService");
const { App } = require("@slack/bolt");

class SchedulerService {
  constructor(slackApp) {
    this.slackApp = slackApp;
    this.reportingService = new ReportingService(slackApp);
    this.isRunning = false;
  }

  /**
   * Start the scheduler service
   */
  start() {
    if (this.isRunning) {
      console.log("Scheduler service is already running");
      return;
    }

    console.log("Starting scheduler service...");

    // Schedule manager reports for Tuesday and Thursday at 9 AM
    cron.schedule("0 9 * * 2,4", async () => {
      console.log("Running scheduled manager reports...");
      await this.runManagerReports();
    }, {
      timezone: "Asia/Kolkata", // Adjust timezone as needed
    });

    // Schedule daily progress checks at 6 PM
    cron.schedule("0 18 * * *", async () => {
      console.log("Running daily progress checks...");
      await this.runDailyProgressChecks();
    }, {
      timezone: "Asia/Kolkata",
    });

    // Schedule weekly summary reports on Monday at 10 AM
    cron.schedule("0 10 * * 1", async () => {
      console.log("Running weekly summary reports...");
      await this.runWeeklySummaryReports();
    }, {
      timezone: "Asia/Kolkata",
    });

    // Schedule monthly analytics reports on the 1st of each month at 11 AM
    cron.schedule("0 11 1 * *", async () => {
      console.log("Running monthly analytics reports...");
      await this.runMonthlyAnalyticsReports();
    }, {
      timezone: "Asia/Kolkata",
    });

    this.isRunning = true;
    console.log("Scheduler service started successfully");
  }

  /**
   * Stop the scheduler service
   */
  stop() {
    if (!this.isRunning) {
      console.log("Scheduler service is not running");
      return;
    }

    cron.getTasks().forEach(task => task.destroy());
    this.isRunning = false;
    console.log("Scheduler service stopped");
  }

  /**
   * Run manager reports for all managers
   */
  async runManagerReports() {
    try {
      console.log("Generating manager reports...");
      
      // Get all managers (in a real implementation, you'd have a managers table)
      const managers = await this.getManagers();
      
      if (managers.length === 0) {
        console.log("No managers found for reporting");
        return;
      }

      const reportPromises = managers.map(async (manager) => {
        try {
          const report = await this.reportingService.generateManagerReport(manager.id, new Date());
          await this.reportingService.sendManagerReport(manager.id, report);
          console.log(`Manager report sent to ${manager.name}`);
        } catch (error) {
          console.error(`Error sending report to manager ${manager.name}:`, error);
        }
      });

      await Promise.all(reportPromises);
      console.log("Manager reports completed");
    } catch (error) {
      console.error("Error running manager reports:", error);
    }
  }

  /**
   * Run daily progress checks and send alerts
   */
  async runDailyProgressChecks() {
    try {
      console.log("Running daily progress checks...");
      
      // Get all active new hires
      const newHires = await this.getActiveNewHires();
      
      for (const newHire of newHires) {
        try {
          await this.checkNewHireProgress(newHire);
        } catch (error) {
          console.error(`Error checking progress for ${newHire.userId}:`, error);
        }
      }
      
      console.log("Daily progress checks completed");
    } catch (error) {
      console.error("Error running daily progress checks:", error);
    }
  }

  /**
   * Run weekly summary reports
   */
  async runWeeklySummaryReports() {
    try {
      console.log("Generating weekly summary reports...");
      
      // Generate overall statistics
      const stats = await this.generateOverallStatistics();
      
      // Send to admin channel
      await this.sendWeeklySummaryToAdmin(stats);
      
      console.log("Weekly summary reports completed");
    } catch (error) {
      console.error("Error running weekly summary reports:", error);
    }
  }

  /**
   * Run monthly analytics reports
   */
  async runMonthlyAnalyticsReports() {
    try {
      console.log("Generating monthly analytics reports...");
      
      // Generate detailed analytics
      const analytics = await this.generateMonthlyAnalytics();
      
      // Send to analytics team
      await this.sendMonthlyAnalytics(analytics);
      
      console.log("Monthly analytics reports completed");
    } catch (error) {
      console.error("Error running monthly analytics reports:", error);
    }
  }

  /**
   * Get all managers (mock implementation)
   * @returns {Array} List of managers
   */
  async getManagers() {
    // In a real implementation, you'd query a managers table
    // For now, return a mock list
    return [
      { id: "U1234567890", name: "John Manager", email: "john.manager@razorpay.com" },
      { id: "U0987654321", name: "Jane Manager", email: "jane.manager@razorpay.com" },
    ];
  }

  /**
   * Get active new hires
   * @returns {Array} List of active new hires
   */
  async getActiveNewHires() {
    // Get users who have started onboarding in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const TaskStatus = require("../models/taskStatus");
    const users = await TaskStatus.distinct("userId");
    
    const newHires = [];
    
    for (const userId of users) {
      try {
        const userInfo = await this.slackApp.client.users.info({
          token: process.env.SLACK_BOT_TOKEN,
          user: userId,
        });

        if (userInfo.ok) {
          const firstTask = await TaskStatus.findOne({ userId }).sort({ createdAt: 1 });
          
          if (firstTask && firstTask.createdAt >= thirtyDaysAgo) {
            newHires.push({
              userId,
              userName: userInfo.user.profile.real_name || "Unknown",
              email: userInfo.user.profile.email || "Unknown",
            });
          }
        }
      } catch (error) {
        console.error(`Error getting user info for ${userId}:`, error);
      }
    }

    return newHires;
  }

  /**
   * Check progress for a specific new hire
   * @param {Object} newHire - New hire data
   */
  async checkNewHireProgress(newHire) {
    const { userId } = newHire;
    
    // Get user's progress
    const TaskStatus = require("../models/taskStatus");
    const ChecklistItem = require("../models/checklistItem");
    const Assessment = require("../models/assessment");

    const [taskStatuses, checklistItems, assessments] = await Promise.all([
      TaskStatus.find({ userId }),
      ChecklistItem.find({ userId }),
      Assessment.find({ userId }),
    ]);

    const completedTasks = taskStatuses.filter(task => task.completed);
    const completedChecklistItems = checklistItems.filter(item => item.completed);
    const completedAssessments = assessments.filter(assessment => assessment.status === "completed");

    const totalItems = taskStatuses.length + checklistItems.length + assessments.length;
    const completedItems = completedTasks.length + completedChecklistItems.length + completedAssessments.length;
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Check for concerning patterns
    const concerns = [];

    // Check for low progress
    if (progressPercentage < 30) {
      concerns.push("Low overall progress");
    }

    // Check for failed assessments
    const failedAssessments = assessments.filter(a => a.status === "failed");
    if (failedAssessments.length >= 2) {
      concerns.push("Multiple assessment failures");
    }

    // Check for inactivity (no activity in last 3 days)
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const recentActivity = taskStatuses.filter(t => t.updatedAt >= threeDaysAgo);
    if (recentActivity.length === 0) {
      concerns.push("No recent activity");
    }

    // Send alert if there are concerns
    if (concerns.length > 0) {
      await this.sendProgressAlert(newHire, concerns, progressPercentage);
    }
  }

  /**
   * Send progress alert for a new hire
   * @param {Object} newHire - New hire data
   * @param {Array} concerns - List of concerns
   * @param {number} progressPercentage - Progress percentage
   */
  async sendProgressAlert(newHire, concerns, progressPercentage) {
    try {
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: newHire.userId,
        text: `📊 Progress Update - ${newHire.userName}`,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📊 Your Onboarding Progress",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Current Progress:* ${progressPercentage}%\n\n*Areas of Concern:*\n${concerns.map(c => `• ${c}`).join('\n')}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*💡 Suggestions:*\n• Review the onboarding materials\n• Complete pending tasks\n• Reach out to your manager if you need help\n• Take your time with assessments",
            },
          },
        ],
      });
    } catch (error) {
      console.error(`Error sending progress alert to ${newHire.userId}:`, error);
    }
  }

  /**
   * Generate overall statistics
   * @returns {Object} Overall statistics
   */
  async generateOverallStatistics() {
    const TaskStatus = require("../models/taskStatus");
    const ChecklistItem = require("../models/checklistItem");
    const Assessment = require("../models/assessment");

    const [totalUsers, totalTasks, totalChecklistItems, totalAssessments] = await Promise.all([
      TaskStatus.distinct("userId"),
      TaskStatus.countDocuments(),
      ChecklistItem.countDocuments(),
      Assessment.countDocuments(),
    ]);

    const completedTasks = await TaskStatus.countDocuments({ completed: true });
    const completedChecklistItems = await ChecklistItem.countDocuments({ completed: true });
    const completedAssessments = await Assessment.countDocuments({ status: "completed" });

    return {
      totalUsers: totalUsers.length,
      totalTasks,
      completedTasks,
      totalChecklistItems,
      completedChecklistItems,
      totalAssessments,
      completedAssessments,
      overallCompletionRate: Math.round(((completedTasks + completedChecklistItems + completedAssessments) / (totalTasks + totalChecklistItems + totalAssessments)) * 100),
    };
  }

  /**
   * Send weekly summary to admin channel
   * @param {Object} stats - Statistics data
   */
  async sendWeeklySummaryToAdmin(stats) {
    try {
      const adminChannel = process.env.ADMIN_CHANNEL || "#onboarding-admin";
      
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: adminChannel,
        text: "📊 Weekly Onboarding Summary",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📊 Weekly Onboarding Summary",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Overall Statistics:*\n• Total Users: ${stats.totalUsers}\n• Tasks Completed: ${stats.completedTasks}/${stats.totalTasks}\n• Checklist Items: ${stats.completedChecklistItems}/${stats.totalChecklistItems}\n• Assessments: ${stats.completedAssessments}/${stats.totalAssessments}\n• Overall Completion Rate: ${stats.overallCompletionRate}%`,
            },
          },
        ],
      });
    } catch (error) {
      console.error("Error sending weekly summary to admin:", error);
    }
  }

  /**
   * Generate monthly analytics
   * @returns {Object} Monthly analytics data
   */
  async generateMonthlyAnalytics() {
    // This would generate detailed analytics for the month
    // Implementation would include trends, patterns, insights, etc.
    return {
      month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      totalUsers: 0,
      averageCompletionTime: 0,
      topPerformingTopics: [],
      areasForImprovement: [],
    };
  }

  /**
   * Send monthly analytics
   * @param {Object} analytics - Analytics data
   */
  async sendMonthlyAnalytics(analytics) {
    // Implementation for sending monthly analytics
    console.log("Monthly analytics:", analytics);
  }
}

module.exports = SchedulerService;
