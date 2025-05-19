// src/routes/onboarding.js
const express = require('express');
const authMiddleware = require('../utils/auth');
const onboardingData = require('../data/onboardingData');
const ChecklistItem = require('../models/checklistItem');
const TaskStatus = require('../models/taskStatus');

module.exports = (boltApp) => {
  const router = express.Router();

  // console.log(JSON.stringify(onboardingData, null, 2));

  router.post('/trigger', authMiddleware, async (req, res) => {
    const { email, function: userFunction, subFunction, userName } = req.body;
    try {
      const user = await boltApp.client.users.lookupByEmail({
        token: process.env.SLACK_BOT_TOKEN,
        email
      });

      const userId = user.user.id;
      await sendOnboardingPlan(boltApp, userId, onboardingData, { userName, userFunction, subFunction });

      res.status(200).send('Onboarding plan triggered successfully.');
    } catch (error) {
      console.error('Error triggering onboarding:', error);
      res.status(500).send('Error triggering onboarding.');
    }
  });

  async function sendOnboardingPlan(boltApp, userId, onboardingData, userData) {
    const { userName, userFunction, subFunction } = userData;
    let checklistItems = [];
    try {
      checklistItems = await ChecklistItem.find();
    } catch (error) {
      console.error("Error fetching checklist items:", error);
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
            text: '📚 *Our Story*\nLet us kickstart your journey with a peek at Razorpay’s incredible growth story. From humble beginnings in 2014 to one of India’s leading fintech giants.\n\n👉 <https://alpha.razorpay.com/repo/employee-induction-v2|Who we are and our journey>'
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
            text: '📚 *Your Superpowers – Tool Access*\nGet access to the essential tools for your journey:\n• Freshdesk\n• Admin Dashboard\n• Merchant Dashboard\n• Coralogix\n• Querybook'
          }
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '📺 *Slack Channels to Join*\nClick the button below to auto-join the relevant Slack channels for your role.'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Join Channels', emoji: true },
              action_id: 'join_channels'
            }
          ]
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
          text: `- ${item.task} ${item.completed ? ':white_check_mark:' : ''}`
        }
      };
      if (!item.completed) {
        sectionBlock.accessory = {
          type: 'button',
          text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
          action_id: `complete_checklist_item_${item._id}`
        };
      }
      welcomeBlocks.push(sectionBlock);
    });

    let onboardingBlocks = [
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `✅ *Here’s your 30-day New Hire Plan:*` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: 'Select a week to view its schedule:' }
      },
      {
        type: 'actions',
        elements: onboardingData.map((weekData, index) => ({
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
          text: { type: 'mrkdwn', text: `✅ *Here’s your 30-day New Hire Plan:*` }
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'Select a week to view its schedule:' }
        },
        {
          type: 'actions',
          elements: onboardingData.map((weekData, index) => ({
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
    const selectedWeek = onboardingData[weekIndex];

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
      text: `Here’s the schedule for *${selectedWeek.week}*.`,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: `Here’s the schedule for *${selectedWeek.week}*.` } },
        { type: 'actions', elements: dayButtons }
      ]
    });
  });

  boltApp.action(/show_day_(\d+)_(\d+)/, async ({ ack, body, client }) => {
    await ack();
    const [weekIndexStr, dayIndexStr] = body.actions[0].action_id.split('_').slice(2);
    const weekIndex = parseInt(weekIndexStr);
    const dayIndex = parseInt(dayIndexStr);

    const day = onboardingData[weekIndex]?.days?.[dayIndex];
    if (!day || !day.events) {
      await client.chat.postMessage({
        channel: body.user.id,
        text: "Sorry, we couldn't find tasks for this day."
      });
      return;
    }

    const taskBlocks = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${day.day}* (${day.time}) — Here are your onboarding tasks:` },
      },
      ...day.events.map((event, i) => ({
        type: 'section',
        text: { type: 'mrkdwn', text: `*${i + 1}. ${event.title}*\nOwner: ${event.owner}\nMode: ${event.mode}` },
        accessory: {
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

  const day = onboardingData[weekIndex]?.days?.[dayIndex];

  if (!day || !day.events) {
    await client.chat.postMessage({
      channel: body.user.id,
      text: "Unable to load the day's tasks. Please try again later.",
    });
    return;
  }

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
        text: `*${i + 1}. ${event.title}*\nOwner: ${event.owner}\nMode: ${event.mode}`,
      },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Mark Complete', emoji: true },
        action_id: `mark_complete_${weekIndex}_${dayIndex}_${i}`,
      }
    }))
  ];

  await client.chat.update({
    token: process.env.SLACK_BOT_TOKEN,
    channel: body.channel.id,
    ts: body.message.ts,
    text: `Tasks for ${day.day}`, // or whatever the message is
    blocks: taskBlocks, // or week buttons
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
    text: `Here’s the schedule for *${selectedWeek.week}*. Please choose a day to see the tasks.`,
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `Here’s the schedule for *${selectedWeek.week}*.` },
      },
      { type: 'actions', elements: dayButtons }
    ],
  });
});


  return router;
};
