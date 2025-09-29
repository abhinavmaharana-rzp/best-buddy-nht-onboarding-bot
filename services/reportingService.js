const Assessment = require("../models/assessment");
const TaskStatus = require("../models/taskStatus");
const ChecklistItem = require("../models/checklistItem");
const ManagerReport = require("../models/managerReport");
const UserProgress = require("../models/userProgress");
const { App } = require("@slack/bolt");

class ReportingService {
  constructor(slackApp) {
    this.slackApp = slackApp;
  }

  /**
   * Generate comprehensive manager report
   * @param {string} managerId - Slack user ID of the manager
   * @param {Date} reportDate - Date for the report
   * @returns {Object} Generated report data
   */
  async generateManagerReport(managerId, reportDate = new Date()) {
    try {
      console.log(`Generating manager report for ${managerId} on ${reportDate}`);

      // Get all new hires under this manager (this would need to be configured)
      const newHires = await this.getNewHiresForManager(managerId);
      
      if (newHires.length === 0) {
        return {
          managerId,
          reportDate,
          summary: {
            totalNewHires: 0,
            message: "No new hires found for this manager",
          },
        };
      }

      // Generate individual reports for each new hire
      const newHireReports = await Promise.all(
        newHires.map(newHire => this.generateNewHireReport(newHire, reportDate))
      );

      // Calculate summary statistics
      const summary = this.calculateSummaryStats(newHireReports);

      // Generate recommendations
      const recommendations = this.generateRecommendations(newHireReports);

      const report = {
        managerId,
        reportDate,
        reportType: "weekly",
        period: {
          startDate: new Date(reportDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          endDate: reportDate,
        },
        newHires: newHireReports,
        summary,
        recommendations,
        status: "draft",
      };

      // Save report to database
      const savedReport = await ManagerReport.create(report);
      
      return savedReport;
    } catch (error) {
      console.error("Error generating manager report:", error);
      throw error;
    }
  }

  /**
   * Get new hires for a specific manager
   * @param {string} managerId - Manager's Slack user ID
   * @returns {Array} List of new hire user objects
   */
  async getNewHiresForManager(managerId) {
    // In a real implementation, you'd have a manager-employee relationship table
    // For now, we'll get all users who have started onboarding in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get all users who have task statuses (indicating they've started onboarding)
    const users = await TaskStatus.distinct("userId");
    
    const newHires = [];
    
    for (const userId of users) {
      try {
        // Get user info from Slack
        const userInfo = await this.slackApp.client.users.info({
          token: process.env.SLACK_BOT_TOKEN,
          user: userId,
        });

        if (userInfo.ok) {
          // Get user's first task to determine start date
          const firstTask = await TaskStatus.findOne({ userId }).sort({ createdAt: 1 });
          
          if (firstTask && firstTask.createdAt >= thirtyDaysAgo) {
            newHires.push({
              userId,
              userName: userInfo.user.profile.real_name || "Unknown",
              email: userInfo.user.profile.email || "Unknown",
              function: userInfo.user.profile.fields?.Xf0DMHFDQA?.value || "Unknown",
              subFunction: userInfo.user.profile.fields?.Xf0DMHFDQB?.value || "Unknown",
              startDate: firstTask.createdAt,
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
   * Generate detailed report for a single new hire
   * @param {Object} newHire - New hire user object
   * @param {Date} reportDate - Report date
   * @returns {Object} New hire report data
   */
  async generateNewHireReport(newHire, reportDate) {
    const { userId } = newHire;

    // Get all task statuses for this user
    const taskStatuses = await TaskStatus.find({ userId });
    const completedTasks = taskStatuses.filter(task => task.completed);

    // Get all checklist items for this user
    const checklistItems = await ChecklistItem.find({ userId });
    const completedChecklistItems = checklistItems.filter(item => item.completed);

    // Get all assessments for this user
    const assessments = await Assessment.find({ userId }).sort({ completedAt: -1 });
    const completedAssessments = assessments.filter(assessment => assessment.status === "completed");
    const failedAssessments = assessments.filter(assessment => assessment.status === "failed");

    // Calculate progress
    const totalTasks = taskStatuses.length;
    const totalChecklistItems = checklistItems.length;
    const totalAssessments = assessments.length;
    
    const tasksCompleted = completedTasks.length;
    const checklistCompleted = completedChecklistItems.length;
    const assessmentsCompleted = completedAssessments.length;

    const overallPercentage = totalTasks + totalChecklistItems + totalAssessments > 0 
      ? Math.round(((tasksCompleted + checklistCompleted + assessmentsCompleted) / (totalTasks + totalChecklistItems + totalAssessments)) * 100)
      : 0;

    // Calculate average assessment score
    const averageScore = completedAssessments.length > 0
      ? Math.round(completedAssessments.reduce((sum, assessment) => sum + (assessment.score || 0), 0) / completedAssessments.length)
      : 0;

    // Generate recent activity
    const recentActivity = this.generateRecentActivity(userId, reportDate);

    // Generate milestones
    const milestones = this.generateMilestones(newHire, completedTasks, completedChecklistItems, completedAssessments);

    // Generate concerns
    const concerns = this.generateConcerns(newHire, assessments, taskStatuses, reportDate);

    return {
      ...newHire,
      progress: {
        overallPercentage,
        tasksCompleted,
        totalTasks,
        assessmentsCompleted,
        totalAssessments,
        averageScore,
      },
      assessments: completedAssessments.map(assessment => ({
        taskTitle: assessment.taskTitle,
        score: assessment.score,
        passed: assessment.passed,
        completedAt: assessment.completedAt,
        attemptCount: assessment.attemptCount,
      })),
      recentActivity,
      milestones,
      concerns,
    };
  }

  /**
   * Generate recent activity for a new hire
   * @param {string} userId - User ID
   * @param {Date} reportDate - Report date
   * @returns {Array} Recent activity array
   */
  async generateRecentActivity(userId, reportDate) {
    const activities = [];
    const sevenDaysAgo = new Date(reportDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get recent assessments
    const recentAssessments = await Assessment.find({
      userId,
      completedAt: { $gte: sevenDaysAgo },
    }).sort({ completedAt: -1 });

    recentAssessments.forEach(assessment => {
      activities.push({
        type: assessment.passed ? "assessment_passed" : "assessment_failed",
        description: `${assessment.passed ? "Passed" : "Failed"} assessment: ${assessment.taskTitle} (${assessment.score}%)`,
        timestamp: assessment.completedAt,
      });
    });

    // Get recent task completions
    const recentTasks = await TaskStatus.find({
      userId,
      completed: true,
      updatedAt: { $gte: sevenDaysAgo },
    }).sort({ updatedAt: -1 });

    recentTasks.forEach(task => {
      activities.push({
        type: "task_completed",
        description: "Completed onboarding task",
        timestamp: task.updatedAt,
      });
    });

    return activities.slice(0, 10); // Limit to 10 most recent activities
  }

  /**
   * Generate milestones for a new hire
   * @param {Object} newHire - New hire data
   * @param {Array} completedTasks - Completed tasks
   * @param {Array} completedChecklistItems - Completed checklist items
   * @param {Array} completedAssessments - Completed assessments
   * @returns {Array} Milestones array
   */
  generateMilestones(newHire, completedTasks, completedChecklistItems, completedAssessments) {
    const milestones = [
      {
        name: "First Week Complete",
        achieved: completedTasks.length >= 5,
        achievedAt: completedTasks.length >= 5 ? newHire.startDate : null,
      },
      {
        name: "First Assessment Passed",
        achieved: completedAssessments.length > 0,
        achievedAt: completedAssessments.length > 0 ? completedAssessments[0].completedAt : null,
      },
      {
        name: "50% Progress",
        achieved: (completedTasks.length + completedChecklistItems.length + completedAssessments.length) >= 10,
        achievedAt: null, // Would need to track when this was achieved
      },
      {
        name: "All Assessments Passed",
        achieved: completedAssessments.length >= 3 && completedAssessments.every(a => a.passed),
        achievedAt: null,
      },
    ];

    return milestones;
  }

  /**
   * Generate concerns for a new hire
   * @param {Object} newHire - New hire data
   * @param {Array} assessments - All assessments
   * @param {Array} taskStatuses - All task statuses
   * @param {Date} reportDate - Report date
   * @returns {Array} Concerns array
   */
  generateConcerns(newHire, assessments, taskStatuses, reportDate) {
    const concerns = [];
    const sevenDaysAgo = new Date(reportDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check for multiple assessment failures
    const failedAssessments = assessments.filter(a => a.status === "failed");
    if (failedAssessments.length >= 2) {
      concerns.push({
        type: "multiple_failures",
        description: `${failedAssessments.length} assessments failed`,
        severity: "high",
        timestamp: new Date(),
      });
    }

    // Check for low performance
    const completedAssessments = assessments.filter(a => a.status === "completed");
    const averageScore = completedAssessments.length > 0
      ? completedAssessments.reduce((sum, a) => sum + a.score, 0) / completedAssessments.length
      : 0;

    if (averageScore > 0 && averageScore < 70) {
      concerns.push({
        type: "low_performance",
        description: `Average assessment score: ${Math.round(averageScore)}%`,
        severity: "medium",
        timestamp: new Date(),
      });
    }

    // Check for inactivity
    const recentActivity = taskStatuses.filter(t => t.updatedAt >= sevenDaysAgo);
    if (recentActivity.length === 0) {
      concerns.push({
        type: "inactive",
        description: "No activity in the last 7 days",
        severity: "medium",
        timestamp: new Date(),
      });
    }

    return concerns;
  }

  /**
   * Calculate summary statistics for all new hires
   * @param {Array} newHireReports - Array of new hire reports
   * @returns {Object} Summary statistics
   */
  calculateSummaryStats(newHireReports) {
    const totalNewHires = newHireReports.length;
    const averageProgress = totalNewHires > 0
      ? Math.round(newHireReports.reduce((sum, report) => sum + report.progress.overallPercentage, 0) / totalNewHires)
      : 0;

    const assessmentsPassed = newHireReports.reduce((sum, report) => 
      sum + report.assessments.filter(a => a.passed).length, 0);
    const assessmentsFailed = newHireReports.reduce((sum, report) => 
      sum + report.assessments.filter(a => !a.passed).length, 0);

    // Identify top performers (above 80% progress)
    const topPerformers = newHireReports
      .filter(report => report.progress.overallPercentage >= 80)
      .map(report => report.userId);

    // Identify users needing attention (below 50% progress or have concerns)
    const needsAttention = newHireReports
      .filter(report => 
        report.progress.overallPercentage < 50 || 
        report.concerns.length > 0
      )
      .map(report => report.userId);

    // Determine overall health
    let overallHealth = "excellent";
    if (averageProgress < 60) overallHealth = "poor";
    else if (averageProgress < 75) overallHealth = "fair";
    else if (averageProgress < 90) overallHealth = "good";

    return {
      totalNewHires,
      averageProgress,
      assessmentsPassed,
      assessmentsFailed,
      topPerformers,
      needsAttention,
      overallHealth,
    };
  }

  /**
   * Generate recommendations based on new hire data
   * @param {Array} newHireReports - Array of new hire reports
   * @returns {Array} Recommendations array
   */
  generateRecommendations(newHireReports) {
    const recommendations = [];

    // Check for users needing intervention
    const strugglingUsers = newHireReports.filter(report => 
      report.progress.overallPercentage < 50 || 
      report.concerns.some(c => c.severity === "high")
    );

    if (strugglingUsers.length > 0) {
      recommendations.push({
        type: "intervention_needed",
        description: `${strugglingUsers.length} new hire(s) may need additional support`,
        priority: "high",
        targetUsers: strugglingUsers.map(u => u.userId),
      });
    }

    // Check for users who might benefit from additional training
    const lowPerformers = newHireReports.filter(report => 
      report.progress.averageScore > 0 && report.progress.averageScore < 70
    );

    if (lowPerformers.length > 0) {
      recommendations.push({
        type: "additional_training",
        description: `${lowPerformers.length} new hire(s) may benefit from additional training`,
        priority: "medium",
        targetUsers: lowPerformers.map(u => u.userId),
      });
    }

    // Check for top performers who should be recognized
    const topPerformers = newHireReports.filter(report => 
      report.progress.overallPercentage >= 90 && 
      report.progress.averageScore >= 85
    );

    if (topPerformers.length > 0) {
      recommendations.push({
        type: "recognition",
        description: `${topPerformers.length} new hire(s) are performing exceptionally well`,
        priority: "low",
        targetUsers: topPerformers.map(u => u.userId),
      });
    }

    return recommendations;
  }

  /**
   * Send manager report via Slack DM
   * @param {string} managerId - Manager's Slack user ID
   * @param {Object} report - Report data
   * @returns {boolean} Success status
   */
  async sendManagerReport(managerId, report) {
    try {
      const blocks = this.formatReportAsSlackBlocks(report);
      
      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: managerId,
        text: `📊 Weekly Onboarding Report - ${report.reportDate.toLocaleDateString()}`,
        blocks,
      });

      // Update report status
      await ManagerReport.findByIdAndUpdate(report._id, {
        status: "sent",
        sentAt: new Date(),
      });

      console.log(`Manager report sent successfully to ${managerId}`);
      return true;
    } catch (error) {
      console.error("Error sending manager report:", error);
      
      // Update report status to failed
      await ManagerReport.findByIdAndUpdate(report._id, {
        status: "failed",
      });
      
      return false;
    }
  }

  /**
   * Format report data as Slack blocks
   * @param {Object} report - Report data
   * @returns {Array} Slack blocks array
   */
  formatReportAsSlackBlocks(report) {
    const { summary, newHires, recommendations } = report;
    
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 Weekly Onboarding Report - ${report.reportDate.toLocaleDateString()}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Report Period:* ${report.period.startDate.toLocaleDateString()} - ${report.period.endDate.toLocaleDateString()}`,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*📈 Summary*\n• Total New Hires: ${summary.totalNewHires}\n• Average Progress: ${summary.averageProgress}%\n• Assessments Passed: ${summary.assessmentsPassed}\n• Assessments Failed: ${summary.assessmentsFailed}\n• Overall Health: ${summary.overallHealth.toUpperCase()}`,
        },
      },
    ];

    // Add top performers section
    if (summary.topPerformers.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🏆 Top Performers*\n${summary.topPerformers.map(userId => {
            const user = newHires.find(nh => nh.userId === userId);
            return `• ${user ? user.userName : userId}`;
          }).join('\n')}`,
        },
      });
    }

    // Add users needing attention
    if (summary.needsAttention.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*⚠️ Needs Attention*\n${summary.needsAttention.map(userId => {
            const user = newHires.find(nh => nh.userId === userId);
            return `• ${user ? user.userName : userId}`;
          }).join('\n')}`,
        },
      });
    }

    // Add individual new hire details
    if (newHires.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*👥 New Hire Details*",
        },
      });

      newHires.forEach(newHire => {
        const progressBar = this.createProgressBar(newHire.progress.overallPercentage);
        const assessmentStatus = newHire.assessments.length > 0 
          ? `(${newHire.assessments.filter(a => a.passed).length}/${newHire.assessments.length} passed)`
          : "(No assessments yet)";

        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${newHire.userName}* (${newHire.function})\n${progressBar} ${newHire.progress.overallPercentage}%\nAssessments: ${assessmentStatus}${newHire.concerns.length > 0 ? '\n⚠️ Has concerns' : ''}`,
          },
        });
      });
    }

    // Add recommendations
    if (recommendations.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*💡 Recommendations*",
        },
      });

      recommendations.forEach(rec => {
        const priorityEmoji = rec.priority === "high" ? "🔴" : rec.priority === "medium" ? "🟡" : "🟢";
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${priorityEmoji} *${rec.type.replace(/_/g, ' ').toUpperCase()}*\n${rec.description}`,
          },
        });
      });
    }

    return blocks;
  }

  /**
   * Create a visual progress bar
   * @param {number} percentage - Progress percentage
   * @returns {string} Progress bar string
   */
  createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }
}

module.exports = ReportingService;
