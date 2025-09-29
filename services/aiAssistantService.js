const { App } = require("@slack/bolt");

class AIAssistantService {
  constructor(slackApp) {
    this.slackApp = slackApp;
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  /**
   * Initialize knowledge base with common questions and answers
   * @returns {Object} Knowledge base
   */
  initializeKnowledgeBase() {
    return {
      "onboarding": {
        "what is razorpay": {
          answer: "Razorpay is India's leading fintech company that provides payment solutions for businesses. We help merchants accept, process, and disburse payments online.",
          keywords: ["razorpay", "company", "what", "about"],
          category: "company",
        },
        "how to access tools": {
          answer: "You can access most tools through the admin dashboard. For specific tools like Freshdesk, Coralogix, and Querybook, check the tool access section in your onboarding plan.",
          keywords: ["tools", "access", "dashboard", "freshdesk", "coralogix"],
          category: "tools",
        },
        "when do i get my laptop": {
          answer: "Laptops are typically provided on your first day. If you haven't received yours, please contact IT support or your manager.",
          keywords: ["laptop", "computer", "equipment", "it"],
          category: "equipment",
        },
        "how to join slack channels": {
          answer: "You can join Slack channels by clicking the 'Join Channels' button in your onboarding plan, or by searching for specific channels and joining them manually.",
          keywords: ["slack", "channels", "join", "groups"],
          category: "communication",
        },
        "what are the working hours": {
          answer: "Razorpay follows flexible working hours. Core hours are typically 10 AM to 6 PM, but you can discuss your preferred schedule with your manager.",
          keywords: ["hours", "working", "time", "schedule"],
          category: "workplace",
        },
        "how to request leave": {
          answer: "You can request leave through the HR portal or by contacting your manager. Check the leave policy in your onboarding materials for details.",
          keywords: ["leave", "vacation", "time off", "holiday"],
          category: "hr",
        },
      },
      "technical": {
        "how to set up development environment": {
          answer: "Follow the development setup guide in your onboarding materials. It includes steps for installing required software, setting up repositories, and configuring your environment.",
          keywords: ["development", "setup", "environment", "code", "programming"],
          category: "development",
        },
        "how to access production systems": {
          answer: "Production access is granted after completing security training and getting approval from your manager. Contact your team lead for the approval process.",
          keywords: ["production", "access", "systems", "deployment"],
          category: "security",
        },
        "how to use git": {
          answer: "Git is used for version control. Check the Git basics guide in your onboarding materials. You can also ask your team members for help with specific Git commands.",
          keywords: ["git", "version control", "repository", "commit"],
          category: "development",
        },
      },
      "assessments": {
        "how to prepare for assessments": {
          answer: "Review the course materials thoroughly, take notes, and practice with sample questions. Make sure you understand the concepts before taking the assessment.",
          keywords: ["assessment", "prepare", "study", "exam", "test"],
          category: "learning",
        },
        "what if i fail an assessment": {
          answer: "Don't worry! You can retake assessments up to 3 times. Review the feedback, study the material again, and try again. Your manager can also provide additional support.",
          keywords: ["fail", "retake", "assessment", "help"],
          category: "learning",
        },
        "how long do assessments take": {
          answer: "Assessment duration varies by topic. Most assessments take 30-45 minutes. Check the specific time limit in your assessment details.",
          keywords: ["duration", "time", "assessment", "minutes"],
          category: "learning",
        },
      },
    };
  }

  /**
   * Process user question and provide answer
   * @param {string} userId - User ID
   * @param {string} question - User's question
   * @returns {Object} Response with answer and suggestions
   */
  async processQuestion(userId, question) {
    try {
      const normalizedQuestion = question.toLowerCase().trim();
      
      // Search knowledge base
      const answer = this.searchKnowledgeBase(normalizedQuestion);
      
      if (answer) {
        // Track question for analytics
        await this.trackQuestion(userId, question, answer.category);
        
        return {
          answer: answer.answer,
          category: answer.category,
          confidence: 0.9,
          suggestions: this.getRelatedSuggestions(answer.category),
        };
      }

      // If no direct answer found, provide general guidance
      return {
        answer: "I don't have a specific answer for that question, but I can help you in a few ways:\n\n• Check your onboarding materials for detailed information\n• Ask your manager or team members\n• Post your question in the #newbies channel\n• Contact HR for policy-related questions",
        category: "general",
        confidence: 0.3,
        suggestions: this.getGeneralSuggestions(),
      };
    } catch (error) {
      console.error("Error processing question:", error);
      return {
        answer: "I'm having trouble processing your question right now. Please try again or contact support.",
        category: "error",
        confidence: 0.0,
        suggestions: [],
      };
    }
  }

  /**
   * Search knowledge base for answer
   * @param {string} question - Normalized question
   * @returns {Object|null} Answer object or null
   */
  searchKnowledgeBase(question) {
    for (const category in this.knowledgeBase) {
      for (const key in this.knowledgeBase[category]) {
        const entry = this.knowledgeBase[category][key];
        const keywords = entry.keywords;
        
        // Check if any keywords match
        const matches = keywords.filter(keyword => question.includes(keyword));
        if (matches.length > 0) {
          return {
            answer: entry.answer,
            category: entry.category,
            keywords: matches,
          };
        }
      }
    }
    return null;
  }

  /**
   * Get related suggestions based on category
   * @param {string} category - Answer category
   * @returns {Array} Related suggestions
   */
  getRelatedSuggestions(category) {
    const suggestions = {
      "company": [
        "What is Razorpay's mission?",
        "How big is the company?",
        "What are the core values?",
      ],
      "tools": [
        "How to access Freshdesk?",
        "What is Coralogix used for?",
        "How to use Querybook?",
      ],
      "equipment": [
        "When will I get my laptop?",
        "How to set up my workspace?",
        "What equipment is provided?",
      ],
      "communication": [
        "How to join team channels?",
        "What are the communication guidelines?",
        "How to use Slack effectively?",
      ],
      "workplace": [
        "What are the office locations?",
        "How does remote work work?",
        "What are the office amenities?",
      ],
      "hr": [
        "How to request leave?",
        "What are the benefits?",
        "How to contact HR?",
      ],
      "development": [
        "How to set up development environment?",
        "What programming languages are used?",
        "How to contribute to codebase?",
      ],
      "security": [
        "What are the security policies?",
        "How to handle sensitive data?",
        "What are the access controls?",
      ],
      "learning": [
        "How to prepare for assessments?",
        "What learning resources are available?",
        "How to track my progress?",
      ],
    };

    return suggestions[category] || [];
  }

  /**
   * Get general suggestions
   * @returns {Array} General suggestions
   */
  getGeneralSuggestions() {
    return [
      "What is Razorpay?",
      "How to access tools?",
      "How to prepare for assessments?",
      "What are the working hours?",
      "How to join Slack channels?",
    ];
  }

  /**
   * Track question for analytics
   * @param {string} userId - User ID
   * @param {string} question - Original question
   * @param {string} category - Answer category
   */
  async trackQuestion(userId, question, category) {
    try {
      // In a real implementation, you'd save this to a database
      console.log(`Question tracked: ${userId} asked "${question}" (category: ${category})`);
      
      // Update user progress
      const GamificationService = require("./gamificationService");
      const gamificationService = new GamificationService(this.slackApp);
      await gamificationService.awardTaskCompletion(userId, "ask_question", { question });
    } catch (error) {
      console.error("Error tracking question:", error);
    }
  }

  /**
   * Send AI assistant response
   * @param {string} userId - User ID
   * @param {Object} response - Response object
   */
  async sendResponse(userId, response) {
    try {
      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🤖 AI Assistant*\n\n${response.answer}`,
          },
        },
      ];

      if (response.suggestions && response.suggestions.length > 0) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*💡 Related Questions:*",
          },
        });

        const suggestionBlocks = response.suggestions.map(suggestion => ({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `• ${suggestion}`,
          },
        }));

        blocks.push(...suggestionBlocks);
      }

      blocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Confidence: ${Math.round(response.confidence * 100)}% | Category: ${response.category}`,
          },
        ],
      });

      await this.slackApp.client.chat.postMessage({
        token: process.env.SLACK_BOT_TOKEN,
        channel: userId,
        text: "AI Assistant Response",
        blocks,
      });
    } catch (error) {
      console.error("Error sending AI response:", error);
    }
  }

  /**
   * Handle AI assistant slash command
   * @param {Object} payload - Slash command payload
   */
  async handleSlashCommand(payload) {
    try {
      const { user_id, text } = payload;
      
      if (!text || text.trim() === "") {
        await this.slackApp.client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: user_id,
          text: "Please ask me a question! For example: 'What is Razorpay?' or 'How do I access tools?'",
        });
        return;
      }

      const response = await this.processQuestion(user_id, text);
      await this.sendResponse(user_id, response);
    } catch (error) {
      console.error("Error handling slash command:", error);
    }
  }

  /**
   * Provide personalized learning recommendations
   * @param {string} userId - User ID
   * @returns {Array} Learning recommendations
   */
  async getLearningRecommendations(userId) {
    try {
      const UserProgress = require("../models/userProgress");
      const userProgress = await UserProgress.findOne({ userId });
      
      if (!userProgress) {
        return this.getDefaultRecommendations();
      }

      const recommendations = [];

      // Based on progress
      if (userProgress.overallProgress < 30) {
        recommendations.push({
          type: "beginner",
          title: "Complete Basic Onboarding",
          description: "Focus on completing your first week tasks and assessments",
          priority: "high",
        });
      }

      // Based on assessment performance
      if (userProgress.performance.averageAssessmentScore < 70) {
        recommendations.push({
          type: "learning",
          title: "Improve Assessment Performance",
          description: "Review course materials and practice with sample questions",
          priority: "medium",
        });
      }

      // Based on social activity
      if (userProgress.socialActivity.questionsAsked < 5) {
        recommendations.push({
          type: "social",
          title: "Engage with the Community",
          description: "Ask questions and participate in discussions",
          priority: "low",
        });
      }

      // Based on learning style
      const learningStyle = userProgress.preferences.learningStyle;
      if (learningStyle === "visual") {
        recommendations.push({
          type: "resources",
          title: "Visual Learning Resources",
          description: "Check out our video tutorials and infographics",
          priority: "low",
        });
      }

      return recommendations.length > 0 ? recommendations : this.getDefaultRecommendations();
    } catch (error) {
      console.error("Error getting learning recommendations:", error);
      return this.getDefaultRecommendations();
    }
  }

  /**
   * Get default learning recommendations
   * @returns {Array} Default recommendations
   */
  getDefaultRecommendations() {
    return [
      {
        type: "beginner",
        title: "Complete Your Onboarding Plan",
        description: "Follow your personalized onboarding plan to get started",
        priority: "high",
      },
      {
        type: "learning",
        title: "Take Assessments",
        description: "Complete assessments to test your knowledge",
        priority: "medium",
      },
      {
        type: "social",
        title: "Join Team Channels",
        description: "Connect with your team and other new hires",
        priority: "low",
      },
    ];
  }
}

module.exports = AIAssistantService;
