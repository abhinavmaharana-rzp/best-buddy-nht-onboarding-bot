const AIAssistantService = require('../../services/aiAssistantService');

// Mock Slack app
const mockSlackApp = {
  client: {
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ok: true }),
    },
  },
};

describe('AIAssistantService', () => {
  let aiAssistant;

  beforeEach(async () => {
    aiAssistant = new AIAssistantService(mockSlackApp);
    
    // Initialize user progress for tests if it doesn't exist
    const UserProgress = require('../../models/userProgress');
    const existingUser = await UserProgress.findOne({ userId: 'U1234567890' });
    if (!existingUser) {
      const userProgress = new UserProgress({
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        status: 'active',
      });
      await userProgress.save();
    }
  });

  describe('processQuestion', () => {
    test('should return answer for known question', async () => {
      const result = await aiAssistant.processQuestion('U1234567890', 'What is Razorpay?');

      expect(result.answer).toContain('fintech company');
      expect(result.category).toBe('company');
      expect(result.confidence).toBe(0.9);
      expect(result.suggestions).toBeDefined();
    });

    test('should return answer for tools question', async () => {
      const result = await aiAssistant.processQuestion('U1234567890', 'How to access tools?');

      expect(result.answer).toContain('admin dashboard');
      expect(result.category).toBe('tools');
      expect(result.confidence).toBe(0.9);
    });

    test('should return answer for assessment question', async () => {
      const result = await aiAssistant.processQuestion('U1234567890', 'How to prepare for assessments?');

      expect(result.answer).toContain('course materials');
      expect(result.category).toBe('learning');
      expect(result.confidence).toBe(0.9);
    });

    test('should return general guidance for unknown question', async () => {
      const result = await aiAssistant.processQuestion('U1234567890', 'Random unknown question?');

      expect(result.answer).toContain('I don\'t have a specific answer');
      expect(result.category).toBe('general');
      expect(result.confidence).toBe(0.3);
      expect(result.suggestions).toBeDefined();
    });

    test('should handle empty question', async () => {
      const result = await aiAssistant.processQuestion('U1234567890', '');

      expect(result.answer).toContain('I don\'t have a specific answer');
      expect(result.category).toBe('general');
    });

    test('should handle case insensitive questions', async () => {
      const result = await aiAssistant.processQuestion('U1234567890', 'WHAT IS RAZORPAY?');

      expect(result.answer).toContain('fintech company');
      expect(result.category).toBe('company');
    });
  });

  describe('searchKnowledgeBase', () => {
    test('should find exact match', () => {
      const result = aiAssistant.searchKnowledgeBase('what is razorpay');

      expect(result).toBeDefined();
      expect(result.answer).toContain('fintech company');
      expect(result.category).toBe('company');
    });

    test('should find partial match', () => {
      const result = aiAssistant.searchKnowledgeBase('razorpay company info');

      expect(result).toBeDefined();
      expect(result.answer).toContain('fintech company');
    });

    test('should return null for no match', () => {
      const result = aiAssistant.searchKnowledgeBase('completely random question');

      expect(result).toBeNull();
    });

    test('should match multiple keywords', () => {
      const result = aiAssistant.searchKnowledgeBase('razorpay fintech payment');

      expect(result).toBeDefined();
      expect(result.answer).toContain('fintech company');
    });
  });

  describe('getRelatedSuggestions', () => {
    test('should return company suggestions', () => {
      const suggestions = aiAssistant.getRelatedSuggestions('company');

      expect(suggestions).toContain('What is Razorpay\'s mission?');
      expect(suggestions).toContain('How big is the company?');
      expect(suggestions).toContain('What are the core values?');
    });

    test('should return tools suggestions', () => {
      const suggestions = aiAssistant.getRelatedSuggestions('tools');

      expect(suggestions).toContain('How to access Freshdesk?');
      expect(suggestions).toContain('What is Coralogix used for?');
      expect(suggestions).toContain('How to use Querybook?');
    });

    test('should return learning suggestions', () => {
      const suggestions = aiAssistant.getRelatedSuggestions('learning');

      expect(suggestions).toContain('How to prepare for assessments?');
      expect(suggestions).toContain('What learning resources are available?');
      expect(suggestions).toContain('How to track my progress?');
    });

    test('should return empty array for unknown category', () => {
      const suggestions = aiAssistant.getRelatedSuggestions('unknown');

      expect(suggestions).toEqual([]);
    });
  });

  describe('getGeneralSuggestions', () => {
    test('should return general suggestions', () => {
      const suggestions = aiAssistant.getGeneralSuggestions();

      expect(suggestions).toContain('What is Razorpay?');
      expect(suggestions).toContain('How to access tools?');
      expect(suggestions).toContain('How to prepare for assessments?');
      expect(suggestions).toContain('What are the working hours?');
      expect(suggestions).toContain('How to join Slack channels?');
    });
  });

  describe('handleSlashCommand', () => {
    test('should handle empty command', async () => {
      const payload = {
        user_id: 'U1234567890',
        text: '',
      };

      await aiAssistant.handleSlashCommand(payload);

      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith({
        token: process.env.SLACK_BOT_TOKEN,
        channel: 'U1234567890',
        text: expect.stringContaining('Please ask me a question'),
      });
    });

    test('should handle valid question', async () => {
      const payload = {
        user_id: 'U1234567890',
        text: 'What is Razorpay?',
      };

      await aiAssistant.handleSlashCommand(payload);

      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith({
        token: process.env.SLACK_BOT_TOKEN,
        channel: 'U1234567890',
        text: 'AI Assistant Response',
        blocks: expect.any(Array),
      });
    });
  });

  describe('getLearningRecommendations', () => {
    test('should return default recommendations for new user', async () => {
      const recommendations = await aiAssistant.getLearningRecommendations('U9999999999');

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].title).toContain('Complete Your Onboarding Plan');
      expect(recommendations[1].title).toContain('Take Assessments');
      expect(recommendations[2].title).toContain('Join Team Channels');
    });

    test('should return personalized recommendations', async () => {
      // Mock UserProgress model
      const UserProgress = require('../../models/userProgress');
      const userProgress = new UserProgress({
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        overallProgress: 20,
        'performance.averageAssessmentScore': 60,
        'socialActivity.questionsAsked': 2,
        'preferences.learningStyle': 'visual',
        status: 'active',
      });
      await userProgress.save();

      const recommendations = await aiAssistant.getLearningRecommendations('U1234567890');

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('getDefaultRecommendations', () => {
    test('should return default recommendations', () => {
      const recommendations = aiAssistant.getDefaultRecommendations();

      expect(recommendations).toHaveLength(3);
      expect(recommendations[0].type).toBe('beginner');
      expect(recommendations[0].priority).toBe('high');
      expect(recommendations[1].type).toBe('learning');
      expect(recommendations[1].priority).toBe('medium');
      expect(recommendations[2].type).toBe('social');
      expect(recommendations[2].priority).toBe('low');
    });
  });

  describe('sendResponse', () => {
    test('should send response with suggestions', async () => {
      const response = {
        answer: 'Test answer',
        category: 'test',
        confidence: 0.8,
        suggestions: ['Suggestion 1', 'Suggestion 2'],
      };

      await aiAssistant.sendResponse('U1234567890', response);

      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith({
        token: process.env.SLACK_BOT_TOKEN,
        channel: 'U1234567890',
        text: 'AI Assistant Response',
        blocks: expect.any(Array),
      });
    });

    test('should send response without suggestions', async () => {
      const response = {
        answer: 'Test answer',
        category: 'test',
        confidence: 0.8,
        suggestions: [],
      };

      await aiAssistant.sendResponse('U1234567890', response);

      expect(mockSlackApp.client.chat.postMessage).toHaveBeenCalledWith({
        token: process.env.SLACK_BOT_TOKEN,
        channel: 'U1234567890',
        text: 'AI Assistant Response',
        blocks: expect.any(Array),
      });
    });
  });
});
