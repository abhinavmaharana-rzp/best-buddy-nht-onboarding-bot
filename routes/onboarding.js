// src/routes/onboarding.js
const express = require('express');
const authMiddleware = require('../utils/auth');
const onboardingData = require('../data/onboardingData');
const srOnboardingData = require('../data/srOnboardingData'); // We'll create this
const checklistData = require('../data/checklistData');
const ChecklistItem = require('../models/checklistItem');
const TaskStatus = require('../models/taskStatus');

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
  router.post('/trigger', authMiddleware, async (req, res) => {
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

  async function sendOnboardingPlan(boltApp, userId, userData) {
    const { userName, userFunction, subFunction } = userData;
    
    // Select onboarding data based on subfunction
    let selectedOnboardingData;
    if (subFunction === 'SR') {
      selectedOnboardingData = srOnboardingData;
    } else {
      // Default plan for Integrations, Tech Support, and TAM
      selectedOnboardingData = onboardingData;
    }

    let checklistItems = [];
    try {
      checklistItems = await ChecklistItem.find({ userId });
      
      if (checklistItems.length === 0) {
        const newItems = checklistData.map(item => ({
          task: item.text.text,
          userId,
          completed: false
        }));
        checklistItems = await ChecklistItem.insertMany(newItems);
      }
    } catch (error) {
      console.error("Error fetching/creating checklist items:", error);
      return;
    }

    let welcomeBlocks = [
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
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View Story', emoji: true },
          action_id: 'view_story'
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📚 *Know Our Culture*\nAt Razorpay, we pride ourselves on a culture that is sharp and dynamic. Every Razor brings a unique perspective, and together, we grow stronger.\n\n👉 <https://docs.google.com/presentation/d/1U1JJYFozfo7kSgG0eSS0s1-9e4IhFVIN4r7vMhVkzt8/edit#slide=id.g5d1f7d325d_0_8|Culture Deck>'
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View Culture', emoji: true },
          action_id: 'view_culture'
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📚 *Our HR Policies*\nHere are the essential HR policies every Razor should know:\n\n👉 <https://alpha.razorpay.com/repo/employee-policies|Employee Policies Hub>\n\n• <https://learnx.disprz.com/#!/skill/144/1/0|PoSH - Prevention of Sexual Harassment>\n• <https://learnx.disprz.com/#!/skill/146/1/0|ISMS>\n• <https://alpha.razorpay.com/repo/httpsdocs-google-comdocumentd1tx17ayr1yrp0h47mwwurnliho4luwt0fzrjg1xfu5w4edituspsharing|Zero Tolerance Policy>'
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'View Policies', emoji: true },
          action_id: 'view_policies'
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '📚 *Your Superpowers – Tool Access*\nGet access to the essential tools for your journey:\n• Freshdesk\n• Admin Dashboard\n• Merchant Dashboard\n• Coralogix\n• Querybook'
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'Get Access', emoji: true },
          action_id: 'get_tool_access'
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
          action_id: 'join_channels'
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '✅ *Your First Week Tasks*'
        }
      }
    ];

    checklistItems.forEach(item => {
      const sectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `- ${item.task}`
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
          action_id: `complete_checklist_item_${item._id}`
        }
      };
      welcomeBlocks.push(sectionBlock);
    });

    // Add handler for checklist completion
    boltApp.action(/complete_checklist_item_(.+)/, async ({ ack, body, client }) => {
      await ack();
      const itemId = body.actions[0].action_id.split('_')[3];
      const userId = body.user.id;

      try {
        // Update checklist item status
        await ChecklistItem.findByIdAndUpdate(itemId, { completed: true });

        // Get the updated checklist items
        const updatedItems = await ChecklistItem.find({ userId });
        
        // Update the message with completed status while preserving all blocks
        const updatedBlocks = body.message.blocks.map(block => {
          if (block.type === 'section' && block.accessory && block.accessory.action_id === `complete_checklist_item_${itemId}`) {
            return {
              ...block,
              text: {
                type: 'mrkdwn',
                text: `${block.text.text} ✓`
              },
              accessory: {
                type: 'button',
                text: { type: 'plain_text', text: '✓', emoji: true },
                action_id: `checklist_completed_${itemId}`,
                style: 'primary'
              }
            };
          }
          return block;
        });

        await client.chat.update({
          token: process.env.SLACK_BOT_TOKEN,
          channel: body.channel.id,
          ts: body.message.ts,
          blocks: updatedBlocks,
          text: `Welcome to Razorpay, ${userName}!`
        });

      } catch (error) {
        console.error('Error updating checklist item:', error);
        await client.chat.postMessage({
          channel: userId,
          text: "Error updating checklist item. Please try again later."
        });
      }
    });

    let onboardingBlocks = [
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
    ];

    let blocks = welcomeBlocks.concat(onboardingBlocks);
    try {
      const { channel } = await boltApp.client.conversations.open({
        token: process.env.SLACK_BOT_TOKEN,
        users: userId,
      });

      const result = await boltApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channel.id, // Use DM channel ID
        text: `Welcome to Razorpay, ${userName}!`,
        blocks
      });

      const ts = result.ts;

      const updatedBlocks = [
        { type: 'divider' },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `✅ *Here's your 30 days Onboarding Plan:*` }
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
            action_id: `show_week_${index}_${ts}`
          }))
        },
      ];

      await boltApp.client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: channel.id,
        ts: ts,
        blocks: welcomeBlocks.concat(updatedBlocks),
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
        text: { type: 'mrkdwn', text: `*${day.day}* (${day.time}) — Here are your onboarding tasks:` },
      },
      ...day.events.map((event, i) => ({
        type: 'section',
        text: { 
          type: 'mrkdwn', 
          text: `*${i + 1}. ${event.title}*\nOwner: ${event.owner}\nMode: ${event.mode}${completedTaskIndices.has(i) ? ' ✓' : ''}` 
        },
        accessory: completedTaskIndices.has(i) ? {
          type: 'button',
          text: { type: 'plain_text', text: '✓', emoji: true },
          action_id: `task_completed_${weekIndex}_${dayIndex}_${i}`,
          style: 'primary'
        } : {
          type: 'button',
          text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
          action_id: `mark_complete_${weekIndex}_${dayIndex}_${i}`
        }
      }))
    ];

    await client.chat.postMessage({
      channel: body.user.id,
      text: `Tasks for ${day.day}`,
      blocks: taskBlocks
    });
  });

  boltApp.action(/mark_complete_\d+_\d+_\d+/, async ({ ack, body, client }) => {
  await ack();

  const actionId = body.actions[0].action_id;
  const [ , , weekIndexStr, dayIndexStr, taskIndexStr ] = actionId.split('_');
  const weekIndex = parseInt(weekIndexStr, 10);
  const dayIndex = parseInt(dayIndexStr, 10);
  const taskIndex = parseInt(taskIndexStr, 10);
  const userId = body.user.id;

  console.log("mark_complete action_id:", actionId);
  console.log({
    weekIndex,
    dayIndex,
    taskIndex,
    onboardingDataLength: onboardingData.length,
    daysLength: onboardingData[weekIndex]?.days?.length,
    eventsLength: onboardingData[weekIndex]?.days?.[dayIndex]?.events?.length,
  });


  if (
    !onboardingData[weekIndex] ||
    !onboardingData[weekIndex].days?.[dayIndex] ||
    !onboardingData[weekIndex].days[dayIndex].events?.[taskIndex]
  ) {
    await client.chat.postMessage({
      channel: userId,
      text: "Invalid task data. Please try again."
    });
    return;
  }

  const task = onboardingData[weekIndex].days[dayIndex].events[taskIndex];
  console.log("Task data:", task);

  // const task = onboardingData?.[weekIndex]?.days?.[dayIndex]?.events?.[taskIndex];

  // if (!task) {
  //   await client.chat.postMessage({
  //     channel: userId,
  //     text: "Invalid task data. Please try again."
  //   });
  //   return;
  // }

  try {
    let taskStatus = await TaskStatus.findOne({ userId, weekIndex, dayIndex, taskIndex });

    if (!taskStatus) {
      taskStatus = new TaskStatus({ userId, weekIndex, dayIndex, taskIndex, completed: true });
    } else {
      taskStatus.completed = true;
    }

    await taskStatus.save();

    const completionBlocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ You have successfully marked "*${task.title}*" as complete.`,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔙 Back to Day', emoji: true },
            action_id: `back_to_day_${weekIndex}_${dayIndex}`,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '📅 Back to Week', emoji: true },
            action_id: `back_to_week_${weekIndex}`,
          }
        ]
      }
    ];

    console.log("Sending confirmation with blocks:", JSON.stringify(completionBlocks, null, 2));

    await client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.channel.id,
      ts: body.message.ts,
      text: `You have successfully marked "${task.title}" as complete.`,
      blocks: completionBlocks,
    });

  } catch (error) {
    console.error("Error saving task status or sending message:", error);
    await client.chat.postMessage({
      channel: userId,
      text: "Error saving the task status. Please try again later."
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
          text: `*${i + 1}. ${event.title}*\nOwner: ${event.owner}\nMode: ${event.mode}${completedTaskIndices.has(i) ? ' ✓' : ''}`,
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

    await client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.channel.id,
      ts: body.message.ts,
      text: `Tasks for ${day.day}`,
      blocks: taskBlocks,
    });
  });


  boltApp.action(/back_to_week_(\d+)/, async ({ ack, body, client }) => {
  await ack();
  const actionId = body.actions[0].action_id;
  const weekIndex = parseInt(actionId.split('_')[3] || actionId.split('_')[2], 10); // fallback logic

  const selectedWeek = onboardingData[weekIndex];

  if (!selectedWeek || !selectedWeek.days) {
    await client.chat.postMessage({
      channel: body.user.id,
      text: "Unable to load the week. Please try again later.",
    });
    return;
  }

  const dayButtons = selectedWeek.days.map((day, index) => ({
    type: 'button',
    text: { type: 'plain_text', text: day.day },
    action_id: `show_day_${weekIndex}_${index}`,
  }));

  await client.chat.postMessage({
    channel: body.user.id,
    text: `Here's the schedule for *${selectedWeek.week}*. Please choose a day to see the tasks.`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `Here's the schedule for *${selectedWeek.week}*.` },
      },
      { type: 'actions', elements: dayButtons }
    ],
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

  return router;
};
