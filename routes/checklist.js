// src/routes/checklist.js
const express = require('express');
const authMiddleware = require('../utils/auth');
const ChecklistItem = require('../models/checklistItem'); // Import the model

module.exports = (boltApp) => {
  const router = express.Router();

  router.post('/trigger', authMiddleware, async (req, res) => {
    const { email } = req.body;

    try {
      // 1. Lookup User in Slack by Email
      const user = await boltApp.client.users.lookupByEmail({
        token: process.env.SLACK_BOT_TOKEN,
        email: email
      });

      const userId = user.user.id;

      // 2. Send Checklist to the User via DM
      await sendChecklist(boltApp, userId);

      res.status(200).send('Checklist triggered successfully.');
    } catch (error) {
      console.error('Error triggering checklist:', error);
      res.status(500).send('Error triggering checklist.');
    }
  });

  async function sendChecklist(boltApp, userId) {
    try {
      // Fetch checklist items from MongoDB
      const checklistItems = await ChecklistItem.find();

      // Create the blocks for the Slack message
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Here is your onboarding checklist:'
          }
        },
        {
          type: 'divider'
        }
      ];

      // Add each checklist item to the blocks
      checklistItems.forEach(item => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `- ${item.task}`
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Mark Complete',
              emoji: true
            },
            action_id: `complete_checklist_item_${item._id}`
          }
        });
      });

      // Send the message to the user
      await boltApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        text: 'Your Onboarding Checklist',
        blocks: blocks
      });
    } catch (error) {
      console.error('Error sending checklist:', error);
    }
  }

  // Handle the "Mark Complete" button click
  boltApp.action(/complete_checklist_item_.*/, async ({ ack, body, client, logger }) => {
    await ack();

    const itemId = body.actions[0].action_id.split('_')[3];
    const userId = body.user.id;

    try {
      // Update the checklist item in MongoDB
      await ChecklistItem.findByIdAndUpdate(itemId, { completed: true });

      // Update the message in Slack to reflect the completed status
      const updatedChecklistItems = await ChecklistItem.find();
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Here is your onboarding checklist:'
          }
        },
        {
          type: 'divider'
        }
      ];

      updatedChecklistItems.forEach(item => {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `- ${item.task} ${item.completed ? ':white_check_mark:' : ''}`
          },
          accessory: item.completed ? null : {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Mark Complete',
              emoji: true
            },
            action_id: `complete_checklist_item_${item._id}`
          }
        });
      });

      await client.chat.update({
        channel: body.channel.id,
        ts: body.message.ts,
        blocks: blocks,
        text: 'Your Onboarding Checklist'
      });
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  });

  return router;
};