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

// Simple in-memory cache
const cache = {
    overview: { data: null, timestamp: null },
    users: { data: null, timestamp: null },
    approvals: { data: null, timestamp: null }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function debugLog(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// Cache middleware
const cacheMiddleware = (key) => async (req, res, next) => {
    const cachedData = cache[key];
    if (cachedData && cachedData.timestamp && (Date.now() - cachedData.timestamp < CACHE_DURATION)) {
        debugLog(`Serving ${key} from cache`);
        return res.json(cachedData.data);
    }
    next();
};

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

// Helper function to get user info from Slack
async function getUserInfo(client, userId) {
    try {
        const userInfo = await client.users.info({
            token: process.env.SLACK_BOT_TOKEN,
            user: userId
        });

        if (!userInfo.ok) {
            throw new Error(userInfo.error);
        }

        return {
            name: userInfo?.user.profile.real_name,
            email: userInfo?.user.profile.email,
            function: userInfo?.user.profile.fields?.Xf0DMHFDQA?.value || 'Unknown',
            subFunction: userInfo?.user.profile.fields?.Xf0DMHFDQB?.value || 'Unknown'
        };
    } catch (error) {
        debugLog(`Error fetching user info for ${userId}:`, error);
        return { name: 'Unknown User', email: 'Unknown', function: 'Unknown', subFunction: 'Unknown' };
    }
}

// Helper function to calculate progress
function calculateProgress(items) {
    const total = items.length;
    const completed = items.filter(item => item.completed).length;
    const percentage = total ? (completed / total) * 100 : 0;
    return { total, completed, percentage };
}

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: Get dashboard overview statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/overview', authMiddleware, cacheMiddleware('overview'), async (req, res) => {
    try {
        debugLog('Fetching overview data');
        
        const [pendingApprovals, uniqueUsers, allTasks, allChecklistItems] = await Promise.all([
            TaskApproval.countDocuments({ status: 'pending' }),
            TaskStatus.distinct('userId'),
            TaskStatus.find(),
            ChecklistItem.find()
        ]);

        const taskProgress = calculateProgress(allTasks);
        const checklistProgress = calculateProgress(allChecklistItems);

        const overviewData = {
            pendingApprovals,
            totalUsers: uniqueUsers.length,
            taskCompletion: taskProgress,
            checklistCompletion: checklistProgress,
            lastUpdated: new Date().toISOString()
        };

        // Update cache
        cache.overview = {
            data: overviewData,
            timestamp: Date.now()
        };

        res.json(overviewData);
    } catch (error) {
        console.error('[DEBUG] Error fetching overview:', error);
        res.status(500).json({ error: 'Error fetching overview data' });
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
router.get('/users', authMiddleware, cacheMiddleware('users'), async (req, res) => {
    try {
        debugLog('Fetching users data');
        const users = await TaskStatus.distinct('userId');

        const userDetails = await Promise.all(users.map(async (userId) => {
            try {
                const [userInfo, tasks, checklistItems] = await Promise.all([
                    getUserInfo(req.app.client, userId),
                    TaskStatus.find({ userId }),
                    ChecklistItem.find({ userId })
                ]);

                return {
                    id: userId,
                    ...userInfo,
                    taskProgress: calculateProgress(tasks),
                    checklistProgress: calculateProgress(checklistItems),
                    lastUpdated: new Date().toISOString()
                };
            } catch (error) {
                debugLog(`Error processing user: ${userId}`, error);
                return null;
            }
        }));

        const validUserDetails = userDetails.filter(user => user !== null);

        // Update cache
        cache.users = {
            data: validUserDetails,
            timestamp: Date.now()
        };

        res.json(validUserDetails);
    } catch (error) {
        console.error('[DEBUG] Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
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
router.get('/approvals', authMiddleware, cacheMiddleware('approvals'), async (req, res) => {
    try {
        const approvals = await TaskApproval.find()
            .sort({ createdAt: -1 })
            .lean();

        const approvalDetails = await Promise.all(approvals.map(async (approval) => {
            try {
                const [userInfo, reviewerInfo] = await Promise.all([
                    getUserInfo(req.app.client, approval.userId),
                    approval.reviewedBy ? getUserInfo(req.app.client, approval.reviewedBy) : null
                ]);

                return {
                    ...approval,
                    user: userInfo,
                    reviewer: reviewerInfo,
                    lastUpdated: new Date().toISOString()
                };
            } catch (error) {
                debugLog(`Error fetching approval details for ${approval._id}:`, error);
                return {
                    ...approval,
                    user: { name: 'Unknown User', email: 'Unknown' },
                    reviewer: null,
                    lastUpdated: new Date().toISOString()
                };
            }
        }));

        // Update cache
        cache.approvals = {
            data: approvalDetails,
            timestamp: Date.now()
        };

        res.json(approvalDetails);
    } catch (error) {
        console.error('Error fetching approval details:', error);
        res.status(500).json({ error: 'Error fetching approval details' });
    }
});

/**
 * @swagger
 * /dashboard/user/{userId}:
 *   get:
 *     summary: Get detailed information for a specific user
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;

        const [userInfo, tasks, checklistItems, approvals] = await Promise.all([
            getUserInfo(req.app.client, userId),
            TaskStatus.find({ userId }).sort({ weekIndex: 1, dayIndex: 1, taskIndex: 1 }),
            ChecklistItem.find({ userId }),
            TaskApproval.find({ userId }).sort({ createdAt: -1 })
        ]);

        const response = {
            user: {
                id: userId,
                ...userInfo
            },
            progress: {
                tasks: calculateProgress(tasks),
                checklist: calculateProgress(checklistItems)
            },
            recentActivity: approvals.map(approval => ({
                taskTitle: approval?.taskTitle,
                status: approval?.status,
                createdAt: approval?.createdAt,
                reviewedAt: approval?.reviewedAt
            })),
            lastUpdated: new Date().toISOString()
        };

        res.json(response);
    } catch (error) {
        console.error(`Error fetching user details for ${req.params.userId}:`, error);
        res.status(500).json({ error: 'Error fetching user details' });
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

        // Clear relevant caches
        cache.overview = { data: null, timestamp: null };
        cache.users = { data: null, timestamp: null };

        res.status(200).json({ message: 'Onboarding plan triggered successfully' });
    } catch (error) {
        console.error('Error triggering onboarding:', error);
        res.status(500).json({ error: 'Error triggering onboarding' });
    }
});

// Apply error handling middleware
router.use(errorHandler);

module.exports = router; 