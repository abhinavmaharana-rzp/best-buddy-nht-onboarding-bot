// src/routes/onboarding.js
const express = require('express');
const authMiddleware = require('../utils/auth');
const onboardingData = require('../data/onboardingData'); // Import the data
const ChecklistItem = require('../models/checklistItem'); // Import the ChecklistItem model
const TaskStatus = require('../models/taskStatus');

module.exports = (boltApp) => {
  const router = express.Router();

  router.post('/trigger', authMiddleware, async (req, res) => {
    console.log("req.body:", req.body);
    const { email, function: userFunction, subFunction, userName } = req.body;

    try {
      // Lookup User in Slack by Email
      const user = await boltApp.client.users.lookupByEmail({
        token: process.env.SLACK_BOT_TOKEN,
        email: email
      });

      const userId = user.user.id;

      // Send Onboarding Plan to the User via DM
      await sendOnboardingPlan(boltApp, userId, onboardingData, { userName, userFunction, subFunction });

      res.status(200).send('Onboarding plan triggered successfully.');
    } catch (error) {
      console.error('Error triggering onboarding:', error);
      res.status(500).send('Error triggering onboarding.');
    }
  });

  async function sendOnboardingPlan(boltApp, userId, onboardingData, userData) {
    console.log("sendOnboardingPlan called");
    console.log("userData:", userData);

    if (!onboardingData || onboardingData.length === 0) {
      console.warn("No onboarding data available. Not sending onboarding plan.");
      return;
    }

    const { userName, userFunction, subFunction } = userData;

    let checklistItems = [];
    try {
      checklistItems = await ChecklistItem.find();
      console.log("Checklist Items:", checklistItems);
    } catch (error) {
      console.error("Error fetching checklist items:", error);
      return;
    }

    console.log("Number of checklist items:", checklistItems.length);

    // ADDED: Log onboardingData structure
    console.log("Onboarding Data:", JSON.stringify(onboardingData, null, 2));

    let welcomeBlocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🎉 Welcome to Razorpay, ${userName}! 👋`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `We are super excited to have you onboard. :rocket:\nWe'll take you through a step-by-step guide to help you onboard smoothly. Please go through all the steps and call out for help if you're stuck anywhere.`
        }
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
          text: `👥 *Your Onboarding Buddy*\n• <@${userId}> – Learning Business Partner`
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
      { type: 'divider' }
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
          text: {
            type: 'plain_text',
            text: 'Mark Complete',
            emoji: true
          },
          action_id: `complete_checklist_item_${item._id}`
        };
      }

      welcomeBlocks.push(sectionBlock);
    });

    let onboardingBlocks = [
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `✅ *Here’s your 30-day New Hire Plan:*`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Select a week to view its schedule:'
        }
      },
      {
        type: 'actions',
        elements: onboardingData.map((weekData, index) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: weekData.week,
            emoji: true
          },
          action_id: `show_week_${index}` // Unique action ID for each week
        }))
      },
    ];

    let otherBlocks = [
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
      { type: 'divider' }
    ];

    // Concatenate welcomeBlocks, onboardingBlocks, and otherBlocks
    let blocks = welcomeBlocks.concat(onboardingBlocks);

    try {
      const result = await boltApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        text: `Welcome to Razorpay, ${userName}!`,
        blocks: blocks
      });

      const ts = result.ts; // Capture the timestamp of the message

      // Update the action_id to include the timestamp
      const updatedOnboardingBlocks = [
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `✅ *Here’s your 30-day New Hire Plan:*`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Select a week to view its schedule:'
          }
        },
        {
          type: 'actions',
          elements: onboardingData.map((weekData, index) => ({
            type: 'button',
            text: {
              type: 'plain_text',
              text: weekData.week,
              emoji: true
            },
            action_id: `show_week_${index}_${ts}` // Include timestamp in action_id
          }))
        },
      ];

      // Update the original message with the new action_ids
      await boltApp.client.chat.update({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        ts: ts,
        blocks: welcomeBlocks.concat(updatedOnboardingBlocks).concat(otherBlocks),
        text: `Welcome to Razorpay, ${userName}!`
      });

    } catch (error) {
      console.error('Error sending onboarding plan:', error);
    }
  }

  // Action listener for week buttons (Corrected)
  boltApp.action(/show_week_\d+/, async ({ ack, body, client, logger }) => {
    await ack();

    const actionId = body.actions[0].action_id;
    const weekIndex = actionId.split('_')[2]; // Extract the week index from action_id

    console.log(`Action ID in show_week: ${actionId}`); // ADDED
    console.log(`Week Index in show_week: ${weekIndex}`); // ADDED

    const selectedWeek = onboardingData[weekIndex]; // Get the week data based on the index

    console.log(`User selected week: ${selectedWeek?.week}`);

    // Check if the selected week exists and has days
    if (!selectedWeek || !selectedWeek.days || selectedWeek.days.length === 0) {
      console.error(`Error: Week data is incomplete or missing days for week ${selectedWeek?.week}`);
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: `Sorry, we couldn't fetch the events for this week. Please try again later.`
      });
      return;
    }

    // Generate day buttons for the selected week
    const dayButtons = selectedWeek.days.map((day, index) => ({
      type: 'button',
      text: {
        type: 'plain_text',
        text: day.day,
      },
      action_id: `show_day_${weekIndex}_${index}`, // Corrected: Include weekIndex in action_id
    }));

    // Post message with day buttons
    try {
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: `Here’s the schedule for *${selectedWeek.week}*. Please choose a day to see the tasks.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Here’s the schedule for *${selectedWeek.week}*. Please choose a day to see the tasks.`,
            },
          },
          {
            type: 'actions',
            elements: dayButtons,
          },
        ],
      });
    } catch (error) {
      console.error('Error sending week details:', error);
    }
  });


        // Day button handler (Corrected)
        boltApp.action(/show_day_(\d+)_(\d+)/, async ({ ack, body, client }) => {
          await ack();
    
          const actionId = body.actions[0].action_id;
          const weekIndexStr = body.actions[0].action_id.split('_')[2];
          const dayIndexStr = body.actions[0].action_id.split('_')[3];

          // Parse the indices *before* using them
          const weekIndex = parseInt(weekIndexStr, 10);
          const dayIndex = parseInt(dayIndexStr, 10);
    
          console.log("Action ID:", actionId); // Log the action ID
          console.log("Week Index:", weekIndex); // Log the week index
          console.log("Day Index:", dayIndex);   // Log the day index
    
          const week = onboardingData[weekIndex];
          const day = week?.days?.[dayIndex];
    
          console.log("Selected Week:", week); // Added logging
          console.log("Selected Day:", day);   // Added logging
    
          if (!day || !day.events) {
            await client.chat.postMessage({
              channel: body.user.id,
              text: "Sorry, we couldn't find tasks for this day. Please try again.",
            });
            return;
          }
    
          console.log("Day Events:", day.events); // Added logging
    
          const taskBlocks = [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${day.day}* (${day.time}) — Here are your onboarding tasks:`,
              },
            },
            ...day.events.map((event, i) => {
              console.log(`weekIndex: ${weekIndex}, dayIndex: ${dayIndex}, i: ${i}`); // Debugging
              return {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${i + 1}. ${event.title}*\nOwner: ${event.owner}\nMode: ${event.mode}`,
                },
                accessory: { // ADDED: Mark Complete Button
                  type: 'button',
                  text: {
                    type: "plain_text",
                    "text": "Mark Complete",
                    "emoji": true
                  },
                  "action_id": `mark_complete_${weekIndex}_${dayIndex}_${i}` // Unique action ID
                }
              };
            }),
          ];
    
          console.log("Task Blocks:", JSON.stringify(taskBlocks, null, 2)); // Added logging
    
          await client.chat.postMessage({
            channel: body.user.id,
            text: `Tasks for ${day.day}`,
            blocks: taskBlocks,
          });
        });


  // Action listener for mark complete button
  boltApp.action(/mark_complete_\d+_\d+_\d+.* /, async ({ ack, body, client, logger }) => {
    await ack();

    const actionId = body.actions[0].action_id;
    const parts = actionId.split('_');

    if (parts.length !== 4) {
      console.error(`Error: Invalid action_id format: ${actionId}`);
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Sorry, there was an error processing your request. Please try again.",
      });
      return;
    }

    const [_, weekIndexStr, dayIndexStr, taskIndexStr] = parts;
    const weekIndex = parseInt(weekIndexStr, 10);
    const dayIndex = parseInt(dayIndexStr, 10);
    const taskIndex = parseInt(taskIndexStr, 10);

    const userId = body.user.id; // Get the user ID from the body

    console.log("Mark Complete Action ID:", actionId);
    console.log("Week Index:", weekIndex);
    console.log("Day Index:", dayIndex);
    console.log("Task Index:", taskIndex);
    console.log("User ID:", userId);

    const selectedWeek = onboardingData[weekIndex]; // Get the week data

    if (!selectedWeek) {
      console.error(`Error: Invalid weekIndex: ${weekIndex}`);
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Sorry, there was an error processing your request. Please try again.",
      });
      return;
    }

    const selectedDay = selectedWeek.days[dayIndex]; // Get the day data

    if (!selectedDay) {
      console.error(`Error: Invalid dayIndex: ${dayIndex}`);
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Sorry, there was an error processing your request. Please try again.",
      });
      return;
    }

    const task = selectedDay.events[taskIndex]; // Get the task data

    if (!task) {
      console.error(`Error: Invalid taskIndex: ${taskIndex}`);
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Sorry, there was an error processing your request. Please try again.",
      });
      return;
    }

    console.log(`User marked task as complete: ${task.title}`);

    try {
      // 1. Check if TaskStatus exists
      let taskStatus = await TaskStatus.findOne({
        userId: userId,
        weekIndex: weekIndex,
        dayIndex: dayIndex,
        taskIndex: taskIndex,
      });

      if (!taskStatus) {
        // 2. Create new TaskStatus if it doesn't exist
        taskStatus = new TaskStatus({
          userId: userId,
          weekIndex: weekIndex,
          dayIndex: dayIndex,
          taskIndex: taskIndex,
          completed: true,
        });
      } else {
        // 3. Update existing TaskStatus
        taskStatus.completed = true;
      }

      await taskStatus.save(); // Save the TaskStatus to the database

      // Acknowledge completion
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: `You have successfully marked "${task.title}" as complete.`,
      });

    } catch (error) {
      console.error("Error saving task status:", error);
      await client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: body.user.id,
        text: "Sorry, there was an error saving the task status. Please try again.",
      });
    }
  });

  return router;
};