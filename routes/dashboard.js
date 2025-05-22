const express = require('express');
const jwt = require('jsonwebtoken');
const TaskApproval = require('../models/taskApproval');
const TaskStatus = require('../models/taskStatus');
const ChecklistItem = require('../models/checklistItem');
const onboardingData = require('../data/onboardingData');
const srOnboardingData = require('../data/srOnboardingData');

const router = express.Router();

// Debug logging
const DEBUG = true;

function debugLog(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    debugLog('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        stack: DEBUG ? err.stack : undefined
    });
};

// Authentication middleware with detailed logging
const authMiddleware = (req, res, next) => {
    debugLog('Auth middleware called for path:', req.path);
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        debugLog('No token provided');
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        debugLog('Token decoded:', { email: decoded.email, role: decoded.role });
        
        if (decoded.email !== 'abhinav.maharana@razorpay.com') {
            debugLog('Unauthorized email:', decoded.email);
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        debugLog('Token verification failed:', error.message);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/overview', authMiddleware, async (req, res, next) => {
    try {
        debugLog('Fetching overview data');
        
        // Get pending approvals count
        const pendingApprovals = await TaskApproval.countDocuments({ status: 'pending' });
        debugLog('Pending approvals count:', pendingApprovals);

        // Get total users with tasks
        const uniqueUsers = await TaskStatus.distinct('userId');
        debugLog('Unique users count:', uniqueUsers.length);

        // Get completion statistics
        const totalTasks = await TaskStatus.countDocuments();
        const completedTasks = await TaskStatus.countDocuments({ completed: true });
        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        debugLog('Task completion stats:', { totalTasks, completedTasks, completionRate });

        // Get checklist completion statistics
        const totalChecklistItems = await ChecklistItem.countDocuments();
        const completedChecklistItems = await ChecklistItem.countDocuments({ completed: true });
        const checklistCompletionRate = totalChecklistItems > 0 ? (completedChecklistItems / totalChecklistItems) * 100 : 0;
        debugLog('Checklist completion stats:', { totalChecklistItems, completedChecklistItems, checklistCompletionRate });

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
        debugLog('Error in overview route:', error);
        next(error);
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
router.get('/users', authMiddleware, async (req, res, next) => {
    try {
        debugLog('Fetching users data');
        const users = await TaskStatus.distinct('userId');
        debugLog('Found users:', users.length);

        const userProgress = [];
        for (const userId of users) {
            try {
                const tasks = await TaskStatus.find({ userId });
                const checklistItems = await ChecklistItem.find({ userId });

                const totalTasks = tasks.length;
                const completedTasks = tasks.filter(task => task.completed).length;
                const totalChecklistItems = checklistItems.length;
                const completedChecklistItems = checklistItems.filter(item => item.completed).length;

                // Get user info from Slack
                const userInfo = await req.app.client.users.info({
                    token: process.env.SLACK_BOT_TOKEN,
                    user: userId
                });

                if (userInfo.ok) {
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
                    debugLog('Processed user:', userId);
                } else {
                    debugLog('Failed to get Slack info for user:', userId);
                }
            } catch (userError) {
                debugLog('Error processing user:', userId, userError);
                // Continue with next user
            }
        }

        res.status(200).json(userProgress);
    } catch (error) {
        debugLog('Error in users route:', error);
        next(error);
    }
});

/**
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await TaskStatus.distinct('userId');
    const userProgress = [];

    for (const userId of users) {
      const tasks = await TaskStatus.find({ userId });
      const checklistItems = await ChecklistItem.find({ userId });

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => task.completed).length;
      const totalChecklistItems = checklistItems.length;
      const completedChecklistItems = checklistItems.filter(item => item.completed).length;

      // Get user info from Slack
      const userInfo = await req.app.client.users.info({
        token: process.env.SLACK_BOT_TOKEN,
        user: userId
      });

      if (userInfo.ok) {
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
        userName: userInfo.ok ? userInfo.user.profile.real_name : 'Unknown',
        userEmail: userInfo.ok ? userInfo.user.profile.email : 'Unknown',
        reviewerName: reviewerInfo?.ok ? reviewerInfo.user.profile.real_name : null
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
 */
router.post('/trigger-onboarding', authMiddleware, async (req, res) => {
  try {
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