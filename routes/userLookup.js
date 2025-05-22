const express = require('express');
const jwt = require('jsonwebtoken');
const TaskApproval = require('../models/taskApproval');
const TaskStatus = require('../models/taskStatus');

const router = express.Router();

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    if (decoded.email !== 'abhinav.maharana@razorpay.com') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

/**
 * @swagger
 * /user-lookup/by-email/{email}:
 *   get:
 *     summary: Get user information by email
 *     tags: [User Lookup]
 *     security:
 *       - bearerAuth: []
 */
router.get('/by-email/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email
    });

    if (!user.ok) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.user);
  } catch (error) {
    console.error('Error looking up user:', error);
    res.status(500).json({ error: 'Error looking up user' });
  }
});

/**
 * @swagger
 * /user-lookup/task-approval/{approvalId}:
 *   post:
 *     summary: Approve or reject a task completion request
 *     tags: [User Lookup]
 *     security:
 *       - bearerAuth: []
 */
router.post('/task-approval/:approvalId', authMiddleware, async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { status } = req.body;

    const approval = await TaskApproval.findById(approvalId);
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    approval.status = status;
    approval.reviewedBy = req.user.id;
    approval.reviewedAt = new Date();
    await approval.save();

    // Update task status
    const taskStatus = await TaskStatus.findOne({
      userId: approval.userId,
      taskId: approval.taskId
    });

    if (taskStatus) {
      taskStatus.completed = status === 'approved';
      await taskStatus.save();
    }

    // Notify user
    const message = status === 'approved'
      ? `Your task completion request for "${approval.taskTitle}" has been approved!`
      : `Your task completion request for "${approval.taskTitle}" has been rejected.`;

    await req.app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: approval.userId,
      text: message
    });

    res.json({ message: 'Task approval updated successfully' });
  } catch (error) {
    console.error('Error updating task approval:', error);
    res.status(500).json({ error: 'Error updating task approval' });
  }
});

/**
 * @swagger
 * /user-lookup/pending-approvals:
 *   get:
 *     summary: Get all pending task approval requests
 *     tags: [Task Approval]
 *     security:
 *       - bearerAuth: []
 */
router.get('/pending-approvals', authMiddleware, async (req, res) => {
  try {
    const adminEmail = 'abhinav.maharana@razorpay.com';
    const adminUser = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email: adminEmail
    });

    if (!adminUser.ok || adminUser.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const pendingApprovals = await TaskApproval.find({ status: 'pending' })
      .sort({ requestedAt: -1 });

    res.status(200).json(pendingApprovals);
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Error fetching pending approvals' });
  }
});

module.exports = router; 