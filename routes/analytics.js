const express = require("express");
const UserProgress = require("../models/userProgress");
const Assessment = require("../models/assessment");
const TaskStatus = require("../models/taskStatus");
const ChecklistItem = require("../models/checklistItem");
const authMiddleware = require("../utils/auth");

const router = express.Router();

/**
 * @swagger
 * /api/analytics/overview:
 *   get:
 *     summary: Get analytics overview
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics overview retrieved successfully
 */
router.get("/overview", authMiddleware, async (req, res) => {
  try {
    // Get basic metrics
    const totalNewHires = await UserProgress.countDocuments({ status: "active" });
    const completedUsers = await UserProgress.countDocuments({ 
      status: "active", 
      overallProgress: { $gte: 80 } 
    });
    const completionRate = totalNewHires > 0 ? Math.round((completedUsers / totalNewHires) * 100) : 0;

    // Get average assessment score
    const assessments = await Assessment.find({ status: "completed" });
    const avgScore = assessments.length > 0 
      ? Math.round(assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length)
      : 0;

    // Get active users (users with activity in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await UserProgress.countDocuments({
      status: "active",
      lastActive: { $gte: sevenDaysAgo }
    });

    // Get progress over time (last 4 weeks)
    const progressOverTime = await getProgressOverTime();

    // Get assessment performance by topic
    const assessmentPerformance = await getAssessmentPerformance();

    // Get top performers
    const topPerformers = await getTopPerformers(10);

    // Get learning path statistics
    const learningPaths = await getLearningPathStats();

    // Get engagement metrics
    const engagementMetrics = await getEngagementMetrics();

    res.json({
      totalNewHires,
      completionRate,
      avgScore,
      activeUsers,
      progressOverTime,
      assessmentPerformance,
      topPerformers,
      learningPaths,
      engagementMetrics,
    });
  } catch (error) {
    console.error("Error getting analytics overview:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/analytics/user-progress:
 *   get:
 *     summary: Get user progress analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of users to return
 *     responses:
 *       200:
 *         description: User progress analytics retrieved successfully
 */
router.get("/user-progress", authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const users = await UserProgress.find({ status: "active" })
      .sort({ overallProgress: -1 })
      .limit(limit)
      .select("userName overallProgress level points streaks.current performance.averageAssessmentScore");

    res.json(users);
  } catch (error) {
    console.error("Error getting user progress:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/analytics/assessments:
 *   get:
 *     summary: Get assessment analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Assessment analytics retrieved successfully
 */
router.get("/assessments", authMiddleware, async (req, res) => {
  try {
    const assessments = await Assessment.aggregate([
      {
        $group: {
          _id: "$taskTitle",
          totalAttempts: { $sum: 1 },
          passedAttempts: { $sum: { $cond: ["$passed", 1, 0] } },
          averageScore: { $avg: "$score" },
          maxScore: { $max: "$score" },
          minScore: { $min: "$score" },
        }
      },
      {
        $addFields: {
          passRate: {
            $multiply: [
              { $divide: ["$passedAttempts", "$totalAttempts"] },
              100
            ]
          }
        }
      },
      {
        $sort: { averageScore: -1 }
      }
    ]);

    res.json(assessments);
  } catch (error) {
    console.error("Error getting assessment analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/analytics/engagement:
 *   get:
 *     summary: Get engagement analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Engagement analytics retrieved successfully
 */
router.get("/engagement", authMiddleware, async (req, res) => {
  try {
    const engagement = await UserProgress.aggregate([
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: "$socialActivity.questionsAsked" },
          totalAnswers: { $sum: "$socialActivity.answersProvided" },
          totalInteractions: { $sum: "$socialActivity.peerInteractions" },
          totalMentorSessions: { $sum: "$socialActivity.mentorSessions" },
          averageStreak: { $avg: "$streaks.current" },
          longestStreak: { $max: "$streaks.longest" },
        }
      }
    ]);

    res.json(engagement[0] || {});
  } catch (error) {
    console.error("Error getting engagement analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /api/analytics/trends:
 *   get:
 *     summary: Get trend analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [week, month, quarter]
 *         description: Time period for trends
 *     responses:
 *       200:
 *         description: Trend analytics retrieved successfully
 */
router.get("/trends", authMiddleware, async (req, res) => {
  try {
    const period = req.query.period || "week";
    const trends = await getTrendAnalytics(period);
    res.json(trends);
  } catch (error) {
    console.error("Error getting trend analytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Helper functions

async function getProgressOverTime() {
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  
  const weeklyProgress = [];
  for (let i = 0; i < 4; i++) {
    const weekStart = new Date(fourWeeksAgo.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = new Date(weekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
    
    const users = await UserProgress.find({
      startDate: { $lte: weekEnd },
      status: "active"
    });
    
    const avgProgress = users.length > 0 
      ? Math.round(users.reduce((sum, user) => sum + user.overallProgress, 0) / users.length)
      : 0;
    
    weeklyProgress.push({
      week: i + 1,
      completion: avgProgress
    });
  }
  
  return weeklyProgress;
}

async function getAssessmentPerformance() {
  const assessments = await Assessment.aggregate([
    {
      $group: {
        _id: "$taskTitle",
        totalAttempts: { $sum: 1 },
        passedAttempts: { $sum: { $cond: ["$passed", 1, 0] } },
        averageScore: { $avg: "$score" },
      }
    },
    {
      $addFields: {
        passRate: {
          $multiply: [
            { $divide: ["$passedAttempts", "$totalAttempts"] },
            100
          ]
        }
      }
    },
    {
      $sort: { averageScore: -1 }
    }
  ]);

  return assessments.map(a => ({
    topic: a._id,
    passRate: Math.round(a.passRate),
    avgScore: Math.round(a.averageScore)
  }));
}

async function getTopPerformers(limit = 10) {
  const performers = await UserProgress.find({ status: "active" })
    .sort({ overallProgress: -1 })
    .limit(limit)
    .select("userName overallProgress level points");

  return performers.map(p => ({
    name: p.userName,
    progress: p.overallProgress,
    level: p.level,
    points: p.points
  }));
}

async function getLearningPathStats() {
  // This would typically come from a learning paths configuration
  // For now, we'll simulate based on user functions
  const functions = await UserProgress.distinct("function");
  
  const paths = [];
  for (const func of functions) {
    const users = await UserProgress.find({ function: func, status: "active" });
    const avgProgress = users.length > 0 
      ? Math.round(users.reduce((sum, user) => sum + user.overallProgress, 0) / users.length)
      : 0;
    
    paths.push({
      name: `${func} Track`,
      users: users.length,
      completion: avgProgress
    });
  }
  
  return paths;
}

async function getEngagementMetrics() {
  const metrics = await UserProgress.aggregate([
    {
      $group: {
        _id: null,
        totalQuestions: { $sum: "$socialActivity.questionsAsked" },
        totalAnswers: { $sum: "$socialActivity.answersProvided" },
        totalInteractions: { $sum: "$socialActivity.peerInteractions" },
        totalMentorSessions: { $sum: "$socialActivity.mentorSessions" },
      }
    }
  ]);

  const result = metrics[0] || {};
  
  return [
    {
      metric: "Questions Asked",
      value: result.totalQuestions || 0,
      trend: "+12%" // This would be calculated based on historical data
    },
    {
      metric: "Peer Interactions",
      value: result.totalInteractions || 0,
      trend: "+8%"
    },
    {
      metric: "Mentor Sessions",
      value: result.totalMentorSessions || 0,
      trend: "+15%"
    }
  ];
}

async function getTrendAnalytics(period) {
  // This would analyze trends over the specified period
  // For now, return mock data
  return {
    period,
    userGrowth: [10, 15, 22, 28, 35, 42, 45],
    completionTrend: [65, 68, 72, 75, 78, 80, 82],
    engagementTrend: [45, 52, 58, 63, 67, 71, 75],
    assessmentTrend: [78, 80, 82, 84, 85, 86, 87]
  };
}

module.exports = router;
