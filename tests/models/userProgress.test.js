const UserProgress = require('../../models/userProgress');

describe('UserProgress Model', () => {
  describe('Schema Validation', () => {
    test('should create a valid user progress', async () => {
      const userData = {
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
      };

      const userProgress = new UserProgress(userData);
      const savedProgress = await userProgress.save();

      expect(savedProgress._id).toBeDefined();
      expect(savedProgress.userId).toBe(userData.userId);
      expect(savedProgress.userName).toBe(userData.userName);
      expect(savedProgress.level).toBe('Rookie');
      expect(savedProgress.points).toBe(0);
    });

    test('should require all mandatory fields', async () => {
      const userData = {
        userName: 'Test User',
        // Missing userId, email, function, subFunction, startDate
      };

      const userProgress = new UserProgress(userData);
      await expect(userProgress.save()).rejects.toThrow();
    });

    test('should set default values', async () => {
      const userData = {
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
      };

      const userProgress = new UserProgress(userData);
      const savedProgress = await userProgress.save();

      expect(savedProgress.level).toBe('Rookie');
      expect(savedProgress.points).toBe(0);
      expect(savedProgress.overallProgress).toBe(0);
      expect(savedProgress.currentWeek).toBe(1);
      expect(savedProgress.badges).toHaveLength(0);
      expect(savedProgress.achievements).toHaveLength(0);
    });

    test('should validate level enum', async () => {
      const userData = {
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        level: 'InvalidLevel',
      };

      const userProgress = new UserProgress(userData);
      await expect(userProgress.save()).rejects.toThrow();
    });

    test('should validate progress range', async () => {
      const userData = {
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        overallProgress: 150, // Invalid progress > 100
      };

      const userProgress = new UserProgress(userData);
      await expect(userProgress.save()).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    let userProgress;

    beforeEach(async () => {
      userProgress = new UserProgress({
        userId: 'U1234567890',
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
      });
      await userProgress.save();
    });

    test('should add points correctly', async () => {
      await userProgress.addPoints(50, 'Test reason');
      
      expect(userProgress.points).toBe(50);
      expect(userProgress.achievements).toHaveLength(1);
      expect(userProgress.achievements[0].points).toBe(50);
    });

    test('should add badge correctly', async () => {
      const badge = {
        name: 'Test Badge',
        description: 'Test badge description',
        category: 'test',
        icon: '🏆',
      };

      await userProgress.addBadge(badge);
      
      expect(userProgress.badges).toHaveLength(1);
      expect(userProgress.badges[0].name).toBe('Test Badge');
      expect(userProgress.badges[0].earnedAt).toBeDefined();
    });

    test('should not add duplicate badge', async () => {
      const badge = {
        name: 'Test Badge',
        description: 'Test badge description',
        category: 'test',
        icon: '🏆',
      };

      await userProgress.addBadge(badge);
      await userProgress.addBadge(badge);
      
      expect(userProgress.badges).toHaveLength(1);
    });

    test('should update streak correctly', async () => {
      await userProgress.updateStreak();
      
      expect(userProgress.streaks.current).toBe(1);
      expect(userProgress.streaks.longest).toBe(1);
      expect(userProgress.streaks.lastActivity).toBeDefined();
    });

    test('should calculate level based on points', () => {
      userProgress.points = 150;
      expect(userProgress.calculatedLevel).toBe('Explorer');
      
      userProgress.points = 500;
      expect(userProgress.calculatedLevel).toBe('Expert');
      
      userProgress.points = 1000;
      expect(userProgress.calculatedLevel).toBe('Legend');
    });
  });

  describe('Database Operations', () => {
    test('should find users by level', async () => {
      const rookie = new UserProgress({
        userId: 'U1',
        userName: 'Rookie User',
        email: 'rookie@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        points: 50,
      });

      const expert = new UserProgress({
        userId: 'U2',
        userName: 'Expert User',
        email: 'expert@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        points: 500,
        level: 'Expert',
      });

      await rookie.save();
      await expert.save();

      const experts = await UserProgress.find({ level: 'Expert' });
      expect(experts).toHaveLength(1);
      expect(experts[0].userName).toBe('Expert User');
    });

    test('should sort by points descending', async () => {
      const user1 = new UserProgress({
        userId: 'U1',
        userName: 'User 1',
        email: 'user1@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        points: 100,
      });

      const user2 = new UserProgress({
        userId: 'U2',
        userName: 'User 2',
        email: 'user2@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        points: 200,
      });

      await user1.save();
      await user2.save();

      const users = await UserProgress.find().sort({ points: -1 });
      expect(users[0].points).toBe(200);
      expect(users[1].points).toBe(100);
    });
  });
});
