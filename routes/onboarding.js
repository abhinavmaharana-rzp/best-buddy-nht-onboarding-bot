// src/routes/onboarding.js
const express = require('express');
const authMiddleware = require('../utils/auth');
const onboardingData = require('../data/onboardingData');
const srOnboardingData = require('../data/srOnboardingData'); // We'll create this
const checklistData = require('../data/checklistData');
const ChecklistItem = require('../models/checklistItem');
const TaskStatus = require('../models/taskStatus');
const TaskApproval = require('../models/taskApproval');
const { text } = require('body-parser');

/**
 * @swagger
 * components:
 *   schemas:
 *     ChecklistProgress:
 *       type: object
 *       properties:
 *         percentage:
 *           type: number
 *           description: Percentage of checklist items completed
 *         total:
 *           type: number
 *           description: Total number of checklist items
 *         completed:
 *           type: number
 *           description: Number of completed checklist items
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               task:
 *                 type: string
 *                 description: Task description
 *               completed:
 *                 type: boolean
 *                 description: Task completion status
 *     OnboardingProgress:
 *       type: object
 *       properties:
 *         percentage:
 *           type: number
 *           description: Percentage of onboarding tasks completed
 *         total:
 *           type: number
 *           description: Total number of onboarding tasks
 *         completed:
 *           type: number
 *           description: Number of completed onboarding tasks
 *         weeks:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               week:
 *                 type: string
 *                 description: Week identifier
 *               total:
 *                 type: number
 *                 description: Total tasks in the week
 *               completed:
 *                 type: number
 *                 description: Completed tasks in the week
 *               days:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                       description: Day identifier
 *                     total:
 *                       type: number
 *                       description: Total tasks for the day
 *                     completed:
 *                       type: number
 *                       description: Completed tasks for the day
 *                     tasks:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                             description: Task title
 *                           owner:
 *                             type: string
 *                             description: Task owner
 *                           mode:
 *                             type: string
 *                             description: Task mode (Online/Offline)
 *                           completed:
 *                             type: boolean
 *                             description: Task completion status
 *     Task:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the task
 *         owner:
 *           type: string
 *           description: Owner of the task
 *         mode:
 *           type: string
 *           description: Mode of the task (Online/Offline)
 *         completed:
 *           type: boolean
 *           description: Task completion status
 *     DaySchedule:
 *       type: object
 *       properties:
 *         day:
 *           type: string
 *           description: Day identifier
 *         time:
 *           type: string
 *           description: Time slot for the day
 *         events:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Task'
 *     WeekSchedule:
 *       type: object
 *       properties:
 *         week:
 *           type: string
 *           description: Week identifier
 *         days:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DaySchedule'
 */

/**
 * @swagger
 * /onboarding/trigger:
 *   post:
 *     summary: Trigger onboarding plan for a new user
 *     tags: [Onboarding]
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
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               function:
 *                 type: string
 *                 description: User's function/role
 *               subFunction:
 *                 type: string
 *                 description: User's sub-function
 *               userName:
 *                 type: string
 *                 description: User's name
 *     responses:
 *       200:
 *         description: Onboarding plan triggered successfully
 *       500:
 *         description: Error triggering onboarding plan
 */
module.exports = (boltApp) => {
  const router = express.Router();

  // console.log(JSON.stringify(onboardingData, null, 2));

  /**
   * @swagger
   * /onboarding/trigger:
   *   post:
   *     summary: Trigger onboarding plan for a new user
   *     tags: [Onboarding]
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
   *             properties:
   *               email:
   *                 type: string
   *                 description: User's email address
   *               function:
   *                 type: string
   *                 description: User's function/role
   *               subFunction:
   *                 type: string
   *                 description: User's sub-function
   *               userName:
   *                 type: string
   *                 description: User's name
   *     responses:
   *       200:
   *         description: Onboarding plan triggered successfully
   *       500:
   *         description: Error triggering onboarding plan
   */
  router.post('/trigger', async (req, res) => {
    const { email, function: userFunction, subFunction, userName } = req.body;
    try {
      const user = await boltApp.client.users.lookupByEmail({
        token: process.env.SLACK_BOT_TOKEN,
        email
      });

      const userId = user.user.id;
      await sendOnboardingPlan(boltApp, userId, { userName, userFunction, subFunction });

      res.status(200).send('Onboarding plan triggered successfully.');
    } catch (error) {
      console.error('Error triggering onboarding:', error);
      res.status(500).send('Error triggering onboarding.');
    }
  });

  // Add these helper functions at the top of the file, after the imports
  const createWelcomeBlocks = (userName, userFunction, subFunction, checklistItems) => {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🎉 Welcome to Razorpay, ${userName}! 👋`, emoji: true }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🏢 *Your Team Info*\n• Function: ${userFunction}\n• Sub-function: ${subFunction}`
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: "📚 *Our Story*\nLet us kickstart your journey with a peek at Razorpay's incredible growth story. From humble beginnings in 2014 to one of India's leading fintech giants.\n\n👉 <https://alpha.razorpay.com/repo/employee-induction-v2|Who we are and our journey>"
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📚 *Know Our Culture*\nAt Razorpay, we pride ourselves on a culture that is sharp and dynamic. Every Razor brings a unique perspective, and together, we grow stronger.\n\n👉 <https://docs.google.com/presentation/d/1U1JJYFozfo7kSgG0eSS0s1-9e4IhFVIN4r7vMhVkzt8/edit#slide=id.g5d1f7d325d_0_8|Culture Deck>'
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📚 *Our HR Policies*\nHere are the essential HR policies every Razor should know:\n\n👉 <https://alpha.razorpay.com/repo/employee-policies|Employee Policies Hub>\n\n• <https://learnx.disprz.com/#!/skill/144/1/0|PoSH - Prevention of Sexual Harassment>\n• <https://learnx.disprz.com/#!/skill/146/1/0|ISMS>\n• <https://alpha.razorpay.com/repo/httpsdocs-google-comdocumentd1tx17ayr1yrp0h47mwwurnliho4luwt0fzrjg1xfu5w4edituspsharing|Zero Tolerance Policy>'
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🛠️ *Your Superpowers – Tool Access*\nHere are the essential tools to power up your journey at Razorpay:\n\n• 🔧 *Freshdesk* – Access will be handled by Team\n• 🛡️ *Admin Dashboard* – Access will be handled by L&D\n• 💼 *Merchant Dashboard* – Access will be handled by L&D\n• 📊 *Coralogix* – <https://docs.google.com/document/d/1DFDoyQRYPN0o5iYMZrSLDy1bsIwLIHX6snpjssuSBLs/edit?usp=sharing|Access>\n• 🔍 *Querybook* – <https://docs.google.com/document/d/1DFDoyQRYPN0o5iYMZrSLDy1bsIwLIHX6snpjssuSBLs/edit?usp=sharing|Access>`
        }
      },

      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📺 *Slack Channels to Join*\nClick the button below to auto-join the relevant Slack channels for your role.'
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'Join Channels', emoji: true },
          url: 'https://slack.com/shortcuts/Ft08KB7PQWHE/7f10ed434d83c141dade075bc6dc7247' // Add this URL
        }
      },

      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ *Your First Week Tasks*'
        }
      },
      ...checklistItems
        .filter(item => item && item._id) 
        .map(item => ({
          type: 'section',
          text: { type: 'mrkdwn', text: `- ${item.task}` },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
            action_id: `complete_checklist_item_${item._id}`
          }
        })
      )
    ];
  };

  const createOnboardingBlocks = (selectedOnboardingData) => {
    return [
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `✅ *Here's your 30 days Onboarding Plan:*` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: 'Select a week to view its schedule:' }
      },
      {
        type: 'actions',
        elements: selectedOnboardingData.map((weekData, index) => ({
          type: 'button',
          text: { type: 'plain_text', text: weekData.week, emoji: true },
          action_id: `show_week_${index}`
        }))
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: 'You can view your progress and mark tasks as complete through these buttons. Your Learning Business Partner will review and approve completed tasks.' }
      }
    ];
  };

  const createTaskBlocks = (day, completedTaskIndices, weekIndex, dayIndex) => {
    // List of tasks that should not have the Mark Complete button
    const noMarkCompleteTasks = [
      'Razorpay Orientation and Culture',
      'Functional Orientation',
      'Mandatory Trainings Allocation',
      'Know your Leaders'
    ];

    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${day.day}* (${day.time}) — Here are your onboarding tasks:`
        }
      },
      ...day.events.map((event, i) => {
        const block = {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${i + 1}. ${event.title}*\nOwner: ${event.owner}\nMode: ${event.mode}${event.link ? `\n🔗 <${event.link}|Start Session>` : ''}${completedTaskIndices.has(i) ? ' ✓' : ''}`
          }
        };

        if (!noMarkCompleteTasks.includes(event.title)) {
          block.accessory = completedTaskIndices.has(i) ? {
            type: 'button',
            text: { type: 'plain_text', text: '✓', emoji: true },
            action_id: `task_completed_${weekIndex}_${dayIndex}_${i}`,
            style: 'primary'
          } : {
            type: 'button',
            text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
            action_id: `mark_complete_${weekIndex}_${dayIndex}_${i}`
          };
        }

        return block;
      }),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📅 Back to Day', emoji: true },
            action_id: `back_to_week_${weekIndex}`
          }
        ]
      }
    ];
  };

  // Add these new helper functions after the existing ones
  const createApprovalBlocks = (userId, task, week, day) => {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Task Completion Request*\nUser: <@${userId}>\nTask: ${task.title}\nWeek: ${week}\nDay: ${day}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Approve', emoji: true },
            style: 'primary',
            action_id: `approve_task_${task._id}`
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Reject', emoji: true },
            style: 'danger',
            action_id: `reject_task_${task._id}`
          }
        ]
      }
    ];
  };

  const createTaskStatusBlocks = (task, status, weekIndex, dayIndex, taskIndex) => {
    const statusEmoji = status === 'completed' ? '✅' : status === 'pending' ? '⏳' : '❌';
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${task.title}*\nOwner: ${task.owner}\nMode: ${task.mode}${task.link ? `\n🔗 <${task.link}|View Resource>` : ''}\n\n${statusEmoji} *Status: ${statusText}*`
        },
        accessory: status === 'completed' ? {
          type: 'button',
          text: { type: 'plain_text', text: '✓', emoji: true },
          action_id: `task_completed_${weekIndex}_${dayIndex}_${taskIndex}`,
          style: 'primary'
        } : {
          type: 'button',
          text: { type: 'plain_text', text: status === 'pending' ? '⏳ Pending' : 'Mark Complete', emoji: true },
          action_id: status === 'pending' ? 
            `task_pending_${weekIndex}_${dayIndex}_${taskIndex}` : 
            `mark_complete_${weekIndex}_${dayIndex}_${taskIndex}`,
          style: status === 'pending' ? 'primary' : 'default'
        }
      }
    ];
  };

  const createWeekButtons = (selectedOnboardingData, messageTs = null) => {
    return selectedOnboardingData.map((weekData, index) => ({
      type: 'button',
      text: { type: 'plain_text', text: weekData.week, emoji: true },
      action_id: messageTs ? `show_week_${index}_${messageTs}` : `show_week_${index}`
    }));
  };

  const createDayButtons = (week, weekIndex) => {
    return week.days.map((day, index) => ({
      type: 'button',
      text: { type: 'plain_text', text: day.day },
      action_id: `show_day_${weekIndex}_${index}`
    }));
  };

  // Update the sendOnboardingPlan function
  async function sendOnboardingPlan(boltApp, userId, userData) {
    const { userName, userFunction, subFunction } = userData;
    
    // Select onboarding data based on subfunction
    const selectedOnboardingData = subFunction === 'SR' ? srOnboardingData : onboardingData;

    // Get or create checklist items
    let checklistItems = await ChecklistItem.find({ userId });
    if (checklistItems.length === 0) {
      const newItems = checklistData.map(item => ({
        task: item.text.text,
        userId,
        completed: false
      }));
      checklistItems = await ChecklistItem.insertMany(newItems);
    }

    // Create welcome blocks
    const welcomeBlocks = createWelcomeBlocks(userName, userFunction, subFunction, checklistItems);
    
    // Create onboarding blocks
    const onboardingBlocks = createOnboardingBlocks(selectedOnboardingData);

    try {
      // Open DM channel with user
      const { channel } = await boltApp.client.conversations.open({
        token: process.env.SLACK_BOT_TOKEN,
        users: userId,
      });

      // Send initial message
      const result = await boltApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channel.id,
        text: `Welcome to Razorpay, ${userName}!`,
        blocks: [...welcomeBlocks, ...onboardingBlocks]
      });

      // Update message with timestamp for week buttons
      const updatedBlocks = onboardingBlocks.map(block => {
        if (block.type === 'actions') {
          return {
            ...block,
            elements: block.elements.map(element => ({
              ...element,
              action_id: `${element.action_id}_${result.ts}`
            }))
          };
        }
        return block;
      });

      await boltApp.client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channel.id,
        ts: result.ts,
        blocks: [...welcomeBlocks, ...updatedBlocks],
        text: `Welcome to Razorpay, ${userName}!`
      });

    } catch (error) {
      console.error('Error sending onboarding plan:', error);
    }
  }

  boltApp.action(/show_week_\d+/, async ({ ack, body, client }) => {
    await ack();
    const actionId = body.actions[0].action_id;
    const weekIndex = parseInt(actionId.split('_')[2]);
    const userId = body.user.id;

    // Get user's subfunction from TaskStatus or another source
    const userTask = await TaskStatus.findOne({ userId });
    const subFunction = userTask?.subFunction || 'default';

    // Select the appropriate onboarding data
    const selectedOnboardingData = subFunction === 'SR' ? srOnboardingData : onboardingData;
    const selectedWeek = selectedOnboardingData[weekIndex];

    if (!selectedWeek || !selectedWeek.days) {
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Sorry, we couldn't fetch the events for this week."
      });
      return;
    }

    const dayButtons = selectedWeek.days.map((day, index) => ({
      type: 'button',
      text: { type: 'plain_text', text: day.day },
      action_id: `show_day_${weekIndex}_${index}`
    }));

    await client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.user.id,
      text: `Here's the schedule for *${selectedWeek.week}*.`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `Here's the schedule for *${selectedWeek.week}*.` } },
        { type: 'actions', elements: dayButtons }
      ]
    });
  });

  // Update the show_day action handler
  boltApp.action(/show_day_(\d+)_(\d+)/, async ({ ack, body, client }) => {
    await ack();
    const [weekIndexStr, dayIndexStr] = body.actions[0].action_id.split('_').slice(2);
    const weekIndex = parseInt(weekIndexStr);
    const dayIndex = parseInt(dayIndexStr);
    const userId = body.user.id;

    const day = onboardingData[weekIndex]?.days?.[dayIndex];
    if (!day || !day.events) {
      await client.chat.postMessage({
        channel: body.user.id,
        text: "Sorry, we couldn't find tasks for this day."
      });
      return;
    }

    // Get completed tasks
    const completedTasks = await TaskStatus.find({
      userId,
      weekIndex,
      dayIndex,
      completed: true
    });
    const completedTaskIndices = new Set(completedTasks.map(task => task.taskIndex));

    // Create and send task blocks
    const taskBlocks = createTaskBlocks(day, completedTaskIndices, weekIndex, dayIndex);
    await client.chat.postMessage({
      channel: body.user.id,
      text: `Tasks for ${day.day}`,
      blocks: taskBlocks
    });
  });

  // Handle mark complete button click
  boltApp.action(/mark_complete_\d+_\d+_\d+/, async ({ ack, body, client }) => {
    await ack();
    const [ , , weekIndexStr, dayIndexStr, taskIndexStr ] = body.actions[0].action_id.split('_');
    const weekIndex = parseInt(weekIndexStr, 10);
    const dayIndex = parseInt(dayIndexStr, 10);
    const taskIndex = parseInt(taskIndexStr, 10);
    const userId = body.user.id;

    try {
      // Validate task data
      const task = onboardingData[weekIndex]?.days?.[dayIndex]?.events?.[taskIndex];
      if (!task) {
        throw new Error('Invalid task data');
      }

      // Create approval request
      const existing = await TaskApproval.findOne({ userId, weekIndex, dayIndex, taskIndex });
        if (existing) {
          console.warn('Approval request already exists:', existing._id);
          await client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: userId,
            text: `⚠️ You've already requested completion approval for "${task.title}".`
          });
        return;
      }
      const approval = new TaskApproval({
        userId,
        taskTitle: task.title,
        weekIndex,
        dayIndex,
        taskIndex,
        messageTs: body.message.ts,
        channelId: body.channel.id
      });
      await approval.save();
      console.log('Approval request created:', approval._id);

      // Notify admin
      const adminEmail = 'abhinav.maharana@razorpay.com';
      const adminUser = await client.users.lookupByEmail({
        token: process.env.SLACK_BOT_TOKEN,
        email: adminEmail
      });

      if (adminUser.ok) {
        const adminBlocks = createApprovalBlocks(
          userId,
          { ...task, _id: approval._id.toString() },
          onboardingData[weekIndex].week,
          onboardingData[weekIndex].days[dayIndex].day
        );


        await client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: adminUser.user.id,
          text: `Task completion request from <@${userId}>`,
          blocks: adminBlocks
        });
      }

      // Update task status in message
      const statusBlocks = createTaskStatusBlocks(task, 'pending', weekIndex, dayIndex, taskIndex);
      await client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.channel.id,
        ts: body.message.ts,
        text: `Task completion request: ${task.title}`,
        blocks: statusBlocks
      });

      // Notify user
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        text: `Your task completion request for "${task.title}" has been submitted and is pending approval.`
      });

    } catch (error) {
      console.error('Error creating approval request:', error);
      await client.chat.postMessage({
        channel: userId,
        text: 'Error creating approval request. Please try again later.'
      });
    }
  });

  // Handle admin approval/rejection
  boltApp.action(/approve_task_(.+)/, async ({ ack, body, client }) => {
    await ack();
    const segments = body.actions[0].action_id.split('_');
    if (segments.length < 3 || !segments[2]) {
      console.error("Invalid action_id format:", body.actions[0].action_id);
      return;
    }
    const approvalId = segments[2];
    
    try {
      const approval = await TaskApproval.findById(approvalId);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      // Update approval status
      approval.status = 'approved';
      approval.reviewedAt = new Date();
      approval.reviewedBy = body.user.id;
      await approval.save();

      // Update task status
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

      // Get task details
      const approvedTask = onboardingData[approval.weekIndex].days[approval.dayIndex].events[approval.taskIndex];
      
      // Update original message
      const statusBlocks = createTaskStatusBlocks(approvedTask, 'completed', approval.weekIndex, approval.dayIndex, approval.taskIndex);

      if (!client?.chat?.postMessage || !client?.chat?.update) {
        console.error("Slack client is not properly initialized.");
        return;
      }

      await client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: approval.channelId,
        ts: approval.messageTs,
        text: `Task completed: ${approvedTask.title}`,
        blocks: statusBlocks
      });

      // Notify user with a button to view all tasks
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: approval.userId,
        text: `✅ Your task completion request for "${approvedTask.title}" has been approved.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ Your task completion request for "${approvedTask.title}" has been approved.`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📋 View Day\'s Tasks', emoji: true },
                action_id: `show_day_${approval.weekIndex}_${approval.dayIndex}`
              }
            ]
          }
        ]
      });

      // Update admin message
      await client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.channel.id,
        ts: body.message.ts,
        text: `Task completion request approved for ${approvedTask.title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Task Completion Request Approved*\nUser: <@${approval.userId}>\nTask: ${approvedTask.title}\nWeek: ${onboardingData[approval.weekIndex].week}\nDay: ${onboardingData[approval.weekIndex].days[approval.dayIndex].day}`
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error processing approval:', error);
      await client.chat.postMessage({
        channel: body.user.id,
        text: 'Error processing approval. Please try again later.'
      });
    }
  });

  // Handle admin rejection
  boltApp.action(/reject_task_(.+)/, async ({ ack, body, client }) => {
    await ack();
    const segments = body.actions[0].action_id.split('_');
if (segments.length < 3 || !segments[2] || segments[2] === 'undefined') {
  console.error("Invalid action_id format:", body.actions[0].action_id);
  await client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: body.user.id,
    text: 'Invalid rejection request. Please try again.'
  });
  return;
}
const approvalId = segments[2];

    
    try {
      const approval = await TaskApproval.findById(approvalId);
      if (!approval) {
        throw new Error('Approval request not found');
      }

      // Update approval status
      approval.status = 'rejected';
      approval.reviewedAt = new Date();
      approval.reviewedBy = body.user.id;
      await approval.save();

      // Update original message
      const rejectedTask = onboardingData[approval.weekIndex].days[approval.dayIndex].events[approval.taskIndex];
      const rejectionBlocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${rejectedTask.title}*\nOwner: ${rejectedTask.owner}\nMode: ${rejectedTask.mode}${rejectedTask.link ? `\n🔗 <${rejectedTask.link}|View Resource>` : ''}\n\n❌ *Status: Rejected*`
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
            action_id: `mark_complete_${approval.weekIndex}_${approval.dayIndex}_${approval.taskIndex}`
          }
        }
      ];

      if (!client?.chat?.postMessage || !client?.chat?.update) {
  console.error("Slack client is not properly initialized.");
  return;
}

      await client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: approval.channelId,
        ts: approval.messageTs,
        text: `Task completion request rejected: ${rejectedTask.title}`,
        blocks: rejectionBlocks
      });

      // Notify user
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: approval.userId,
        text: `Your task completion request for "${rejectedTask.title}" has been rejected.`
      });

      // Update admin message
      await client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.channel.id,
        ts: body.message.ts,
        text: `Task completion request rejected for ${rejectedTask.title}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *Task Completion Request Rejected*\nUser: <@${approval.userId}>\nTask: ${rejectedTask.title}\nWeek: ${onboardingData[approval.weekIndex].week}\nDay: ${onboardingData[approval.weekIndex].days[approval.dayIndex].day}`
            }
          }
        ]
      });

    } catch (error) {
      console.error('Error processing rejection:', error);
      await client.chat.postMessage({
        channel: body.user.id,
        text: 'Error processing rejection. Please try again later.'
      });
    }
  });

  boltApp.action(/back_to_day_(\d+)_(\d+)/, async ({ ack, body, client }) => {
    await ack();
    const actionId = body.actions[0].action_id;
    const [ , , weekIndexStr, dayIndexStr ] = actionId.split('_');
    const weekIndex = parseInt(weekIndexStr, 10);
    const dayIndex = parseInt(dayIndexStr, 10);
    const userId = body.user.id;

    // Get user's subfunction from TaskStatus or another source
    const userTask = await TaskStatus.findOne({ userId });
    const subFunction = userTask?.subFunction || 'default';

    // Select the appropriate onboarding data
    const selectedOnboardingData = subFunction === 'SR' ? srOnboardingData : onboardingData;
    const day = selectedOnboardingData[weekIndex]?.days?.[dayIndex];

    if (!day || !day.events) {
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Unable to load the day's tasks. Please try again later.",
      });
      return;
    }

    // Get completed tasks for this user
    const completedTasks = await TaskStatus.find({
      userId,
      weekIndex,
      dayIndex,
      completed: true
    });

    const completedTaskIndices = new Set(completedTasks.map(task => task.taskIndex));

    const taskBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${day.day}* (${day.time}) — Here are your onboarding tasks:`,
        },
      },
      ...day.events.map((event, i) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${i + 1}. ${event.title}*\nOwner: ${event.owner}\nMode: ${event.mode}${event.link ? `\n🔗 <${event.link}|View Resource>` : ''}${completedTaskIndices.has(i) ? ' ✓' : ''}`,
        },
        accessory: completedTaskIndices.has(i) ? {
          type: 'button',
          text: { type: 'plain_text', text: '✓', emoji: true },
          action_id: `task_completed_${weekIndex}_${dayIndex}_${i}`,
          style: 'primary'
        } : {
          type: 'button',
          text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
          action_id: `mark_complete_${weekIndex}_${dayIndex}_${i}`,
        }
      })),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📅 Back to Week', emoji: true },
            action_id: `back_to_week_${weekIndex}`,
          }
        ]
      }
    ];

    await client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.user.id,
      text: `Tasks for ${day.day}`,
      blocks: taskBlocks,
    });
  });


  boltApp.action(/back_to_week_(\d+)/, async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;
    const weekIndex = parseInt(body.actions[0].action_id.split('_')[3]);

    // Get user's subfunction from TaskStatus or another source
    const userTask = await TaskStatus.findOne({ userId });
    const subFunction = userTask?.subFunction || 'default';

    // Select the appropriate onboarding data
    const selectedOnboardingData = subFunction === 'SR' ? srOnboardingData : onboardingData;
    const selectedWeek = selectedOnboardingData[weekIndex];

    if (!selectedWeek || !selectedWeek.days) {
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Sorry, we couldn't fetch the events for this week."
      });
      return;
    }

    // Create day buttons for the selected week
    const dayButtons = selectedWeek.days.map((day, index) => ({
      type: 'button',
      text: { type: 'plain_text', text: day.day },
      action_id: `show_day_${weekIndex}_${index}`
    }));

    // Create navigation buttons
    const navigationButtons = [
      {
        type: 'button',
        text: { type: 'plain_text', text: '📅 Back to All Weeks', emoji: true },
        action_id: 'show_all_weeks'
      }
    ];

    await client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.user.id,
      text: `Here's the schedule for *${selectedWeek.week}*.`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `Here's the schedule for *${selectedWeek.week}*.` } },
        { type: 'actions', elements: dayButtons },
        { type: 'actions', elements: navigationButtons }
      ]
    });
  });

  // Add new action handler for showing all weeks
  boltApp.action('show_all_weeks', async ({ ack, body, client }) => {
    await ack();
    const userId = body.user.id;

    // Get user's subfunction from TaskStatus or another source
    const userTask = await TaskStatus.findOne({ userId });
    const subFunction = userTask?.subFunction || 'default';

    // Select the appropriate onboarding data
    const selectedOnboardingData = subFunction === 'SR' ? srOnboardingData : onboardingData;

    // Create week buttons for all weeks
    const weekButtons = selectedOnboardingData.map((weekData, index) => ({
      type: 'button',
      text: { type: 'plain_text', text: weekData.week, emoji: true },
      action_id: `show_week_${index}`
    }));

    await client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.user.id,
      text: 'Select a week to view its schedule:',
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: 'Select a week to view its schedule:' } },
        { type: 'actions', elements: weekButtons }
      ]
    });
  });

/**
 * @swagger
 * /onboarding/progress/{userId}:
 *   get:
 *     summary: Get user's onboarding progress
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Slack user ID
 *     responses:
 *       200:
 *         description: User's onboarding progress
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checklist:
 *                   $ref: '#/components/schemas/ChecklistProgress'
 *                 onboarding:
 *                   $ref: '#/components/schemas/OnboardingProgress'
 *                 total:
 *                   type: object
 *                   properties:
 *                     percentage:
 *                       type: number
 *                       description: Overall completion percentage
 *       500:
 *         description: Error fetching progress report
 */
router.get('/progress/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get checklist progress
    const checklistItems = await ChecklistItem.find({ userId });
    const checklistProgress = {
      total: checklistItems.length,
      completed: checklistItems.filter(item => item.completed).length,
      items: checklistItems.map(item => ({
        task: item.task,
        completed: item.completed
      }))
    };

    // Get onboarding tasks progress
    const taskStatuses = await TaskStatus.find({ userId });
    const onboardingProgress = {
      total: 0,
      completed: 0,
      weeks: []
    };

    // Get user's subfunction to determine which onboarding data to use
    const userTask = await TaskStatus.findOne({ userId });
    const subFunction = userTask?.subFunction || 'default';
    const selectedOnboardingData = subFunction === 'SR' ? srOnboardingData : onboardingData;

    // Calculate progress for each week and day
    selectedOnboardingData.forEach((week, weekIndex) => {
      const weekProgress = {
        week: week.week,
        total: 0,
        completed: 0,
        days: []
      };

      week.days.forEach((day, dayIndex) => {
        const dayProgress = {
          day: day.day,
          total: day.events.length,
          completed: 0,
          tasks: []
        };

        day.events.forEach((event, taskIndex) => {
          const taskStatus = taskStatuses.find(
            status => status.weekIndex === weekIndex && 
                     status.dayIndex === dayIndex && 
                     status.taskIndex === taskIndex
          );

          dayProgress.tasks.push({
            title: event.title,
            owner: event.owner,
            mode: event.mode,
            completed: taskStatus?.completed || false
          });

          if (taskStatus?.completed) {
            dayProgress.completed++;
            weekProgress.completed++;
            onboardingProgress.completed++;
          }
        });

        dayProgress.total = day.events.length;
        weekProgress.total += day.events.length;
        onboardingProgress.total += day.events.length;
        weekProgress.days.push(dayProgress);
      });

      onboardingProgress.weeks.push(weekProgress);
    });

    // Calculate overall progress
    const overallProgress = {
      checklist: {
        percentage: checklistProgress.total ? (checklistProgress.completed / checklistProgress.total) * 100 : 0,
        ...checklistProgress
      },
      onboarding: {
        percentage: onboardingProgress.total ? (onboardingProgress.completed / onboardingProgress.total) * 100 : 0,
        ...onboardingProgress
      },
      total: {
        percentage: (checklistProgress.total + onboardingProgress.total) ? 
          ((checklistProgress.completed + onboardingProgress.completed) / 
          (checklistProgress.total + onboardingProgress.total)) * 100 : 0
      }
    };

    res.status(200).json(overallProgress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ error: 'Error fetching progress report' });
  }
});

/**
 * @swagger
 * /onboarding/task/complete:
 *   post:
 *     summary: Mark a task as complete
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - weekIndex
 *               - dayIndex
 *               - taskIndex
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Slack user ID
 *               weekIndex:
 *                 type: integer
 *                 description: Index of the week
 *               dayIndex:
 *                 type: integer
 *                 description: Index of the day
 *               taskIndex:
 *                 type: integer
 *                 description: Index of the task
 *     responses:
 *       200:
 *         description: Task marked as complete successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task marked as complete
 *       500:
 *         description: Error marking task as complete
 */
router.post('/task/complete', authMiddleware, async (req, res) => {
  const { userId, weekIndex, dayIndex, taskIndex } = req.body;
  try {
    const taskStatus = await TaskStatus.findOne({ userId, weekIndex, dayIndex, taskIndex });
    if (!taskStatus) {
      await TaskStatus.create({ userId, weekIndex, dayIndex, taskIndex, completed: true });
    } else {
      taskStatus.completed = true;
      await taskStatus.save();
    }
    res.status(200).json({ message: 'Task marked as complete' });
  } catch (error) {
    console.error('Error marking task as complete:', error);
    res.status(500).json({ error: 'Error marking task as complete' });
  }
});

/**
 * @swagger
 * /onboarding/day/{weekIndex}/{dayIndex}:
 *   get:
 *     summary: Get tasks for a specific day
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: weekIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index of the week
 *       - in: path
 *         name: dayIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index of the day
 *     responses:
 *       200:
 *         description: Day's tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DaySchedule'
 *       404:
 *         description: Day not found
 *       500:
 *         description: Error retrieving day's tasks
 */
router.get('/day/:weekIndex/:dayIndex', authMiddleware, async (req, res) => {
  const { weekIndex, dayIndex } = req.params;
  try {
    const day = onboardingData[weekIndex]?.days?.[dayIndex];
    if (!day) {
      res.status(404).json({ error: 'Day not found' });
      return;
    }
    res.status(200).json(day);
  } catch (error) {
    console.error('Error retrieving day\'s tasks:', error);
    res.status(500).json({ error: 'Error retrieving day\'s tasks' });
  }
});

/**
 * @swagger
 * /onboarding/week/{weekIndex}:
 *   get:
 *     summary: Get schedule for a specific week
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: weekIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Index of the week
 *     responses:
 *       200:
 *         description: Week's schedule retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WeekSchedule'
 *       404:
 *         description: Week not found
 *       500:
 *         description: Error retrieving week's schedule
 */
router.get('/week/:weekIndex', authMiddleware, async (req, res) => {
  const { weekIndex } = req.params;
  try {
    const week = onboardingData[weekIndex];
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }
    res.status(200).json(week);
  } catch (error) {
    console.error('Error retrieving week\'s schedule:', error);
    res.status(500).json({ error: 'Error retrieving week\'s schedule' });
  }
});

/**
 * @swagger
 * /onboarding/checklist/complete/{itemId}:
 *   post:
 *     summary: Mark a checklist item as complete
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the checklist item
 *     responses:
 *       200:
 *         description: Checklist item marked as complete successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Checklist item marked as complete
 *       404:
 *         description: Checklist item not found
 *       500:
 *         description: Error marking checklist item as complete
 */
router.post('/checklist/complete/:itemId', authMiddleware, async (req, res) => {
  const { itemId } = req.params;
  try {
    const item = await ChecklistItem.findById(itemId);
    if (!item) {
      res.status(404).json({ error: 'Checklist item not found' });
      return;
    }
    item.completed = true;
    await item.save();
    res.status(200).json({ message: 'Checklist item marked as complete' });
  } catch (error) {
    console.error('Error marking checklist item as complete:', error);
    res.status(500).json({ error: 'Error marking checklist item as complete' });
  }
});

/**
 * @swagger
 * /onboarding/checklist/{userId}:
 *   get:
 *     summary: Get user's checklist items
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Slack user ID
 *     responses:
 *       200:
 *         description: Checklist items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   task:
 *                     type: string
 *                     description: Task description
 *                   completed:
 *                     type: boolean
 *                     description: Task completion status
 *       500:
 *         description: Error retrieving checklist items
 */
router.get('/checklist/:userId', authMiddleware, async (req, res) => {
  const { userId } = req.params;
  try {
    const checklistItems = await ChecklistItem.find({ userId });
    res.status(200).json(checklistItems.map(item => ({
      task: item.task,
      completed: item.completed
    })));
  } catch (error) {
    console.error('Error retrieving checklist items:', error);
    res.status(500).json({ error: 'Error retrieving checklist items' });
  }
});

/**
 * @swagger
 * /onboarding/tasks/{userId}:
 *   get:
 *     summary: Get all tasks for a specific user
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 */
router.get('/tasks/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user info from Slack
    const userInfo = await req.app.client.users.info({
      token: process.env.SLACK_BOT_TOKEN,
      user: userId
    });

    if (!userInfo.ok) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get all tasks for the user
    const tasks = await TaskStatus.find({ userId })
      .sort({ weekIndex: 1, dayIndex: 1, taskIndex: 1 });

    // Get all checklist items for the user
    const checklistItems = await ChecklistItem.find({ userId })
      .sort({ weekIndex: 1, dayIndex: 1, itemIndex: 1 });

    // Get user's function and sub-function
    const userFunction = userInfo.user.profile.fields?.Xf0DMHFDQA?.value || 'Unknown';
    const subFunction = userInfo.user.profile.fields?.Xf0DMHFDQB?.value || 'Unknown';

    // Get the appropriate onboarding data based on function
    const onboardingPlan = subFunction === 'SR' ? srOnboardingData : onboardingData;

    // Format the response
    const response = {
      user: {
        id: userId,
        name: userInfo.user.profile.real_name,
        email: userInfo.user.profile.email,
        function: userFunction,
        subFunction: subFunction
      },
      weeks: onboardingPlan.weeks.map((week, weekIndex) => ({
        weekNumber: weekIndex + 1,
        days: week.days.map((day, dayIndex) => ({
          dayNumber: dayIndex + 1,
          tasks: day.tasks.map((task, taskIndex) => {
            const taskStatus = tasks.find(t => 
              t.weekIndex === weekIndex && 
              t.dayIndex === dayIndex && 
              t.taskIndex === taskIndex
            );
            return {
              ...task,
              completed: taskStatus?.completed || false,
              status: taskStatus?.status || 'pending'
            };
          }),
          checklistItems: day.checklistItems.map((item, itemIndex) => {
            const itemStatus = checklistItems.find(i => 
              i.weekIndex === weekIndex && 
              i.dayIndex === dayIndex && 
              i.itemIndex === itemIndex
            );
            return {
              ...item,
              completed: itemStatus?.completed || false
            };
          })
        }))
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ error: 'Error fetching user tasks' });
  }
});

  return router;
};
