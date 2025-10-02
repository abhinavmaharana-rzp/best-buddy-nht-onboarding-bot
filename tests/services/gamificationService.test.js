/**
 * Gamification Service Tests
 * 
 * Comprehensive test suite for the GamificationService class.
 * Tests points awarding, badge management, level progression, and leaderboards.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const GamificationService = require('../../services/gamificationService');
const UserProgress = require('../../models/userProgress');

/**
 * Mock Slack App
 * 
 * Provides a mock Slack app instance for testing without actual Slack API calls.
 */
const mockSlackApp = {
  client: {
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ok: true }),
    },
  },
};

describe('GamificationService', () => {
  let gamificationService;

  beforeEach(() => {
    gamificationService = new GamificationService(mockSlackApp);
  });

  describe('initializeUserProgress', () => {
    test('should create new user progress', async () => {
      const userData = {
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
      };

      const result = await gamificationService.initializeUserProgress('U1234567890', userData);

      expect(result.userId).toBe('U1234567890');
      expect(result.userName).toBe('Test User');
      expect(result.level).toBe('Rookie');
      expect(result.points).toBe(0);
    });

    test('should return existing user progress', async () => {
      const userData = {
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
      };

      // Create first user
      await gamificationService.initializeUserProgress('U1234567890', userData);
      
      // Try to create same user again
      const result = await gamificationService.initializeUserProgress('U1234567890', userData);

      expect(result.userId).toBe('U1234567890');
    });
  });

  describe('awardTaskCompletion', () => {
    let userProgress;

    beforeEach(async () => {
      const userData = {
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
      };
      userProgress = await gamificationService.initializeUserProgress('U1234567890', userData);
    });

    test('should award points for checklist item', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'checklist_item',
        { item: 'test' }
      );

      expect(result.points).toBe(10);
    });

    test('should award points for assessment passed', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'assessment_passed',
        { score: 85 }
      );

      expect(result.points).toBe(25);
      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].name).toBe('Assessment Master');
    });

    test('should award points for perfect score', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'assessment_perfect',
        { score: 100 }
      );

      expect(result.points).toBe(50);
      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].name).toBe('Perfect Score');
    });

    test('should award points for first week complete', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'first_week_complete',
        { week: 1 }
      );

      expect(result.points).toBe(100);
      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].name).toBe('First Week Warrior');
    });

    test('should award points for streak', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'streak_7_days',
        { days: 7 }
      );

      expect(result.points).toBe(75);
      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].name).toBe('Consistent Learner');
    });

    test('should award points for helping peer', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'help_peer',
        { peerId: 'U0987654321' }
      );

      expect(result.points).toBe(20);
      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].name).toBe('Team Player');
    });

    test('should award points for asking question', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'ask_question',
        { question: 'How do I...' }
      );

      expect(result.points).toBe(5);
    });

    test('should award points for completing week', async () => {
      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'complete_week',
        { week: 2 }
      );

      expect(result.points).toBe(200);
      expect(result.badges).toHaveLength(1);
      expect(result.badges[0].name).toBe('Week Champion');
    });

    test('should handle level up', async () => {
      // Set user to high points to trigger level up
      userProgress.points = 250;
      await userProgress.save();

      const result = await gamificationService.awardTaskCompletion(
        'U1234567890',
        'checklist_item',
        { item: 'test' }
      );

      expect(result.level).toBe('Achiever');
    });

    test('should throw error for non-existent user', async () => {
      await expect(
        gamificationService.awardTaskCompletion('U9999999999', 'checklist_item', {})
      ).rejects.toThrow('User progress not found');
    });
  });

  describe('getLeaderboard', () => {
    beforeEach(async () => {
      // Create test users with different points
      const users = [
        { userId: 'U1', userName: 'User 1', points: 100, level: 'Explorer' },
        { userId: 'U2', userName: 'User 2', points: 200, level: 'Achiever' },
        { userId: 'U3', userName: 'User 3', points: 50, level: 'Rookie' },
      ];

      for (const user of users) {
        const userProgress = new UserProgress({
          userId: user.userId,
          userName: user.userName,
          email: `${user.userId}@example.com`,
          function: 'Engineering',
          subFunction: 'Backend',
          startDate: new Date(),
          points: user.points,
          level: user.level,
          status: 'active',
        });
        await userProgress.save();
      }
    });

    test('should return leaderboard sorted by points', async () => {
      const leaderboard = await gamificationService.getLeaderboard('points', 10);

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].points).toBe(200);
      expect(leaderboard[1].points).toBe(100);
      expect(leaderboard[2].points).toBe(50);
    });

    test('should return leaderboard sorted by streak', async () => {
      // Update users with different streaks
      await UserProgress.updateOne({ userId: 'U1' }, { 'streaks.current': 5 });
      await UserProgress.updateOne({ userId: 'U2' }, { 'streaks.current': 10 });
      await UserProgress.updateOne({ userId: 'U3' }, { 'streaks.current': 2 });

      const leaderboard = await gamificationService.getLeaderboard('streak', 10);

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].streak).toBe(10);
      expect(leaderboard[1].streak).toBe(5);
      expect(leaderboard[2].streak).toBe(2);
    });

    test('should limit results', async () => {
      const leaderboard = await gamificationService.getLeaderboard('points', 2);

      expect(leaderboard).toHaveLength(2);
    });
  });

  describe('getUserProgressSummary', () => {
    test('should return null for non-existent user', async () => {
      const summary = await gamificationService.getUserProgressSummary('U9999999999');
      expect(summary).toBeNull();
    });

    test('should return user progress summary', async () => {
      const userProgress = new UserProgress({
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        points: 150,
        level: 'Explorer',
        overallProgress: 75,
        'streaks.current': 5,
        'streaks.longest': 10,
        badges: [
          { name: 'Test Badge', description: 'Test', earnedAt: new Date() },
        ],
        achievements: [
          { name: 'Test Achievement', description: 'Test', earnedAt: new Date() },
        ],
        status: 'active',
      });
      await userProgress.save();

      const summary = await gamificationService.getUserProgressSummary('U1234567890');

      expect(summary.userName).toBe('Test User');
      expect(summary.level).toBe('Explorer');
      expect(summary.points).toBe(150);
      expect(summary.overallProgress).toBe(75);
      expect(summary.streak).toBe(5);
      expect(summary.longestStreak).toBe(10);
      expect(summary.badges).toBe(1);
      expect(summary.achievements).toBe(1);
      expect(summary.nextLevelPoints).toBe(100); // 250 - 150
    });
  });

  describe('generateWeeklyGoals', () => {
    test('should generate 4 weeks of goals', () => {
      const goals = gamificationService.generateWeeklyGoals();

      expect(goals).toHaveLength(4);
      expect(goals[0].week).toBe(1);
      expect(goals[3].week).toBe(4);
    });

    test('should include appropriate goals for each week', () => {
      const goals = gamificationService.generateWeeklyGoals();

      // Week 1 should have basic goals
      expect(goals[0].goals).toHaveLength(3);
      expect(goals[0].goals[0].name).toContain('Complete Week 1 Tasks');

      // Week 2+ should have social goals
      expect(goals[1].goals).toHaveLength(4);
      expect(goals[1].goals[3].name).toContain('Help a Fellow New Hire');
    });
  });

  describe('getNextLevelPoints', () => {
    test('should calculate points needed for next level', () => {
      expect(gamificationService.getNextLevelPoints(50)).toBe(50); // Rookie -> Explorer
      expect(gamificationService.getNextLevelPoints(150)).toBe(100); // Explorer -> Achiever
      expect(gamificationService.getNextLevelPoints(500)).toBe(250); // Achiever -> Expert
      expect(gamificationService.getNextLevelPoints(1000)).toBe(0); // Already at max level
    });
  });
});
