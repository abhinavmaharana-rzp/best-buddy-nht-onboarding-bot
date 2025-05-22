const express = require('express');
const authMiddleware = require('../utils/auth');
const TaskApproval = require('../models/taskApproval');
const TaskStatus = require('../models/taskStatus');

const router = express.Router();

/**
 * @swagger
 * /user-lookup/email/{email}:
 *   get:
 *     summary: Get user information by email
 *     tags: [User Lookup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/email/:email', authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const user = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email
    });

    if (!user.ok) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      userId: user.user.id,
      email: user.user.profile.email,
      name: user.user.profile.real_name
    });
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
 *     tags: [Task Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: approvalId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 */
router.post('/task-approval/:approvalId', authMiddleware, async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { status } = req.body;
    const adminEmail = 'abhinav.maharana@razorpay.com';

    // Verify admin
    const adminUser = await req.app.client.users.lookupByEmail({
      token: process.env.SLACK_BOT_TOKEN,
      email: adminEmail
    });

    if (!adminUser.ok || adminUser.user.id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const approval = await TaskApproval.findById(approvalId);
    if (!approval) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    approval.status = status;
    approval.reviewedAt = new Date();
    approval.reviewedBy = req.user.id;
    await approval.save();

    // Update task status if approved
    if (status === 'approved') {
      await TaskStatus.findOneAndUpdate(
        {
          userId: approval.userId,
          weekIndex: approval.weekIndex,
          dayIndex: approval.dayIndex,
          taskIndex: approval.taskIndex
        },
        { completed: true },
        { upsert: true }
      );
    }

    // Notify user
    await req.app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: approval.userId,
      text: `Your task completion request for "${approval.taskTitle}" has been ${status}.`
    });

    res.status(200).json({ message: `Task ${status} successfully` });
  } catch (error) {
    console.error('Error processing task approval:', error);
    res.status(500).json({ error: 'Error processing task approval' });
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