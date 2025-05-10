# Razorpay Employee Onboarding Slack Bot

This Slack bot automates and streamlines the employee onboarding process at Razorpay. It sends personalized onboarding plans to new hires, provides access to essential resources, and facilitates a smooth transition into the company.

## Table of Contents

1.  [Overview](#overview)
2.  [Features](#features)
3.  [Prerequisites](#prerequisites)
4.  [Installation](#installation)
5.  [Configuration](#configuration)
6.  [Usage](#usage)
7.  [Data Structure](#data-structure)
8.  [Code Structure](#code-structure)
9.  [Error Handling and Logging](#error-handling-and-logging)
10. [Database Setup](#database-setup)
11. [Slack API Integration](#slack-api-integration)
12. [Authentication](#authentication)
13. [Deployment](#deployment)
14. [Contributing](#contributing)
15. [License](#license)

## Overview

The Razorpay Employee Onboarding Slack Bot is designed to enhance the new hire experience by providing a structured onboarding plan directly within Slack.  It leverages the Slack API, a database (e.g., MongoDB), and a web server (e.g., Express.js) to deliver personalized onboarding content and track progress.

## Features

*   **Personalized Onboarding Plans:**  Generates customized onboarding plans based on the new hire's function and sub-function.
*   **Direct Messaging:** Sends onboarding plans directly to new hires via Slack direct messages.
*   **Interactive Checklists:**  Provides interactive checklists for new hires to track their progress.
*   **Resource Links:**  Offers easy access to essential company resources, HR policies, and tool access information.
*   **30-Day New Hire Plan:** Presents a structured 30-day onboarding schedule with weekly breakdowns.
*   **Dynamic Message Updates:** Updates the original onboarding message with day-specific tasks upon week selection.
*   **Database Integration:** Stores checklist items and task statuses in a database (e.g., MongoDB).
*   **Authentication:** Securely authenticates requests to trigger the onboarding process.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js:** (Version 16 or higher recommended)  [https://nodejs.org/](https://nodejs.org/)
*   **npm:** (Usually comes with Node.js)
*   **MongoDB:** (or another compatible database) [https://www.mongodb.com/](https://www.mongodb.com/)
*   **Slack CLI:** (For local testing) [https://api.slack.com/future/tools/cli](https://api.slack.com/future/tools/cli)

You will also need:

*   **Slack App:** A Slack app with the necessary permissions (see [Slack API Integration](#slack-api-integration)).
*   **Slack Bot Token:**  A bot token for your Slack app.
*   **Signing Secret:**  A signing secret for your Slack app.
*   **MongoDB Connection String:**  A connection string to your MongoDB database.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url>
    cd <your-repository-directory>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

## Configuration

1.  **Create a `.env` file:**

    Create a `.env` file in the root directory of the project and add the following environment variables:

    ```
    SLACK_BOT_TOKEN=<your_slack_bot_token>
    SLACK_SIGNING_SECRET=<your_slack_signing_secret>
    MONGODB_CONNECTION_STRING=<your_mongodb_connection_string>
    PORT=3000 # Or any other port you prefer
    ```

    Replace the placeholder values with your actual credentials.

2.  **Configure Slack App:**

    *   Go to your Slack app's settings page ([https://api.slack.com/apps](https://api.slack.com/apps)).
    *   Configure the following:
        *   **Basic Information:**  Set the app name and description.
        *   **OAuth & Permissions:**
            *   Add the following Bot Token Scopes:
                *   `chat:write`
                *   `chat:write.public`
                *   `users:read`
                *   `users:read.email`
                *   `conversations:history`
        *   **Event Subscriptions:** (If using real-time events)
            *   Enable Events.
            *   Set the Request URL to your server's endpoint (e.g., `https://your-server.com/slack/events`).
            *   Subscribe to the necessary events (e.g., `message.im`).
        *   **Interactive Components:**
            *   Enable Interactive Components.
            *   Set the Request URL to your server's endpoint (e.g., `https://your-server.com/slack/actions`).

## Usage

1.  **Start the server:**

    ```bash
    npm start
    ```

2.  **Trigger the onboarding plan:**

    Send a POST request to the `/onboarding/trigger` endpoint with the following JSON payload:

    ```json
    {
      "email": "newhire@example.com",
      "function": "Engineering",
      "subFunction": "Backend",
      "userName": "John Doe"
    }
    ```

    You will need to implement authentication middleware (as indicated by `authMiddleware` in `src/routes/onboarding.js`) to secure this endpoint.  A basic example using a shared secret:

    ```javascript
    // src/utils/auth.js
    const authMiddleware = (req, res, next) => {
      const authHeader = req.headers.authorization;

      if (authHeader === `Bearer <your_shared_secret>`) {
        next();
      } else {
        res.status(401).send('Unauthorized');
      }
    };

    module.exports = authMiddleware;
    ```

    Remember to replace `<your_shared_secret>` with a strong, randomly generated secret and store it securely.  Set the `Authorization` header in your POST request:

    ```
    Authorization: Bearer <your_shared_secret>
    ```

3.  **Interact with the bot in Slack:**

    The new hire will receive a direct message from the bot with their personalized onboarding plan.  They can interact with the checklist items and week selection buttons.

## Data Structure

*   **`onboardingData.js`:**  This file contains the onboarding plan data, structured as an array of weeks, each containing an array of days with tasks.

    ```javascript
    // Example:
    module.exports = [
      {
        week: "Week 1",
        days: [
          {
            day: "Monday",
            tasks: ["Complete HR onboarding", "Meet your team"],
          },
          {
            day: "Tuesday",
            tasks: ["Set up your development environment", "Attend team meeting"],
          },
        ],
      },
      // ... more weeks
    ];
    ```

*   **`ChecklistItem` Model:** (MongoDB Model)

    ```javascript
    // Example:
    const mongoose = require('mongoose');

    const checklistItemSchema = new mongoose.Schema({
      task: { type: String, required: true },
      completed: { type: Boolean, default: false },
    });

    module.exports = mongoose.model('ChecklistItem', checklistItemSchema);
    ```

## Code Structure

*   **`src/app.js`:**  Main entry point for the application.  Initializes the Slack Bolt app and connects to the database.
*   **`src/routes/onboarding.js`:**  Defines the `/onboarding/trigger` route and the `sendOnboardingPlan` function.
*   **`src/data/onboardingData.js`:**  Contains the onboarding plan data.
*   **`src/models/checklistItem.js`:** Defines the Mongoose model for checklist items.
*   **`src/utils/auth.js`:** (Example) Contains the authentication middleware.

## Error Handling and Logging

*   The code includes `try...catch` blocks to handle potential errors during Slack API calls and database operations.
*   Error messages are logged to the console using `console.error`.
*   Consider using a more robust logging library (e.g., Winston, Morgan) for production environments.
*   Implement fallback mechanisms (e.g., sending a new message if `client.chat.update` fails).

## Database Setup

1.  **Install Mongoose:**

    ```bash
    npm install mongoose
    ```

2.  **Connect to MongoDB:**

    In `src/index.js`, connect to your MongoDB database using the connection string from your `.env` file:

    ```javascript
    const mongoose = require('mongoose');

    mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {}).then(() => {
      console.log('Connected to MongoDB');
    }).catch(err => {
      console.error('Error connecting to MongoDB:', err);
    });
    ```

3.  **Define Models:**

    Create Mongoose models for your data (e.g., `ChecklistItem`, `TaskStatus`).

## Slack API Integration

*   The bot uses the `@slack/bolt` library to interact with the Slack API.
*   The `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` environment variables are used to authenticate with the Slack API.
*   The `client.chat.postMessage` method is used to send messages to users.
*   The `client.chat.update` method is used to update existing messages.
*   The `client.users.lookupByEmail` method is used to retrieve user information by email.

## Authentication

*   The `/onboarding/trigger` endpoint is protected by authentication middleware (`authMiddleware`).
*   The example `authMiddleware` uses a shared secret in the `Authorization` header.
*   Consider using a more robust authentication mechanism (e.g., JWT, OAuth) for production environments.

## Deployment

1.  **Deploy to a hosting platform:**

    Deploy the application to a hosting platform such as Heroku, AWS, Google Cloud, or Azure.

2.  **Set environment variables:**

    Set the necessary environment variables (e.g., `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `MONGODB_CONNECTION_STRING`) in your hosting platform's settings.

3.  **Configure Slack App:**

    Update the Request URLs in your Slack app's settings to reflect your deployed server's URL.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Make your changes and commit them with descriptive commit messages.
4.  Push your changes to your fork.
5.  Submit a pull request.

## License

[MIT License](LICENSE) (or specify your preferred license)