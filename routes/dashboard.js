const express = require('express');
const authMiddleware = require('../utils/auth');
const TaskApproval = require('../models/taskApproval');
const TaskStatus = require('../models/taskStatus');
const ChecklistItem = require('../models/checklistItem');
const onboardingData = require('../data/onboardingData');
const srOnboardingData = require('../data/srOnboardingData');

const router = express.Router();

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const adminEmail = 'abhinav.maharana@razorpay.com';
    const adminUser = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email: adminEmail
    });

    if (!adminUser.ok || adminUser.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get pending approvals count
    const pendingApprovals = await TaskApproval.countDocuments({ status: 'pending' });

    // Get total users with tasks
    const uniqueUsers = await TaskStatus.distinct('userId');

    // Get completion statistics
    const totalTasks = await TaskStatus.countDocuments();
    const completedTasks = await TaskStatus.countDocuments({ completed: true });
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Get checklist completion statistics
    const totalChecklistItems = await ChecklistItem.countDocuments();
    const completedChecklistItems = await ChecklistItem.countDocuments({ completed: true });
    const checklistCompletionRate = totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0;

    res.status(200).json({
      pendingApprovals,
      totalUsers: uniqueUsers.length,
      taskCompletion: {
        total: totalTasks,
        completed: completedTasks,
        rate: completionRate
      },
      checklistCompletion: {
        total: totalChecklistItems,
        completed: completedChecklistItems,
        rate: checklistCompletionRate
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({ error: 'Error fetching dashboard overview' });
  }
});

/**
 * @swagger
 * /dashboard/users:
 *   get:
 *     summary: Get all users with their progress
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const adminEmail = 'abhinav.maharana@razorpay.com';
    const adminUser = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email: adminEmail
    });

    if (!adminUser.ok || adminUser.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const users = await TaskStatus.distinct('userId');
    const userProgress = [];

    for (const userId of users) {
      const userInfo = await req.app.client.users.info({
        token: process.env.SLACK_BOT_TOKEN,
        user: userId
      });

      const tasks = await TaskStatus.find({ userId });
      const checklistItems = await ChecklistItem.find({ userId });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.completed).length;
      const totalChecklistItems = checklistItems.length;
      const completedChecklistItems = checklistItems.filter(item => item.completed).length;

      userProgress.push({
        userId,
        name: userInfo.user.profile.real_name,
        email: userInfo.user.profile.email,
        taskProgress: {
          total: totalTasks,
          completed: completedTasks,
          rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
        },
        checklistProgress: {
          total: totalChecklistItems,
          completed: completedChecklistItems,
          rate: totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0
        }
      });
    }

    res.status(200).json(userProgress);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({ error: 'Error fetching user progress' });
  }
});

/**
 * @swagger
 * /dashboard/approvals:
 *   get:
 *     summary: Get all approval requests with details
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/approvals', authMiddleware, async (req, res) => {
  try {
    const adminEmail = 'abhinav.maharana@razorpay.com';
    const adminUser = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email: adminEmail
    });

    if (!adminUser.ok || adminUser.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const approvals = await TaskApproval.find()
      .sort({ requestedAt: -1 });

    const approvalDetails = await Promise.all(approvals.map(async (approval) => {
      const userInfo = await req.app.client.users.info({
        token: process.env.SLACK_BOT_TOKEN,
        user: approval.userId
      });

      const reviewerInfo = approval.reviewedBy ? await req.app.client.users.info({
        token: process.env.SLACK_BOT_TOKEN,
        user: approval.reviewedBy
      }) : null;

      return {
        ...approval.toObject(),
        userName: userInfo.user.profile.real_name,
        userEmail: userInfo.user.profile.email,
        reviewerName: reviewerInfo ? reviewerInfo.user.profile.real_name : null
      };
    }));

    res.status(200).json(approvalDetails);
  } catch (error) {
    console.error('Error fetching approval details:', error);
    res.status(500).json({ error: 'Error fetching approval details' });
  }
});

/**
 * @swagger
 * /dashboard/trigger-onboarding:
 *   post:
 *     summary: Trigger onboarding plan for a user
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - function
 *               - subFunction
 *               - userName
 */
router.post('/trigger-onboarding', authMiddleware, async (req, res) => {
  try {
    const adminEmail = 'abhinav.maharana@razorpay.com';
    const adminUser = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email: adminEmail
    });

    if (!adminUser.ok || adminUser.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { email, function: userFunction, subFunction, userName } = req.body;

    const user = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email
    });

    if (!user.ok) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = user.user.id;
    await sendOnboardingPlan(req.app, userId, { userName, userFunction, subFunction });

    res.status(200).json({ message: 'Onboarding plan triggered successfully' });
  } catch (error) {
    console.error('Error triggering onboarding:', error);
    res.status(500).json({ error: 'Error triggering onboarding' });
  }
});

module.exports = router; 