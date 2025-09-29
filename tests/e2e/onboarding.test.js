const request = require('supertest');
const express = require('express');
const Assessment = require('../../models/assessment');
const TaskStatus = require('../../models/taskStatus');
const UserProgress = require('../../models/userProgress');

// Mock the Slack app for E2E tests
const mockSlackApp = {
  client: {
    chat: {
      postMessage: jest.fn().mockResolvedValue({ ok: true }),
    },
    users: {
      info: jest.fn().mockResolvedValue({
        ok: true,
        user: {
          profile: {
            real_name: 'Test User',
            email: 'test@example.com',
          },
        },
      }),
      lookupByEmail: jest.fn().mockResolvedValue({
        ok: true,
        user: { id: 'U1234567890' },
      }),
    },
  },
};

// Create a test app
const app = express();
app.use(express.json());

// Mock the onboarding routes
const onboardingRoutes = require('../../routes/onboarding');
app.use('/onboarding', onboardingRoutes(mockSlackApp));

describe('Onboarding E2E Tests', () => {
  describe('Complete Onboarding Flow', () => {
    test('should handle complete onboarding process', async () => {
      const userId = 'U1234567890';
      
      // 1. Initialize user progress
      const userProgress = new UserProgress({
        userId,
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        status: 'active',
      });
      await userProgress.save();

      // 2. Create task status
      const taskStatus = new TaskStatus({
        userId,
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        completed: false,
      });
      await taskStatus.save();

      // 3. Create assessment
      const assessment = new Assessment({
        userId,
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'pending',
        createdBy: 'system',
      });
      await assessment.save();

      // 4. Complete assessment
      assessment.status = 'completed';
      assessment.score = 85;
      assessment.passed = true;
      assessment.completedAt = new Date();
      await assessment.save();

      // 5. Complete task
      taskStatus.completed = true;
      await taskStatus.save();

      // 6. Update user progress
      userProgress.overallProgress = 100;
      userProgress.points = 150;
      userProgress.level = 'Explorer';
      await userProgress.save();

      // Verify final state
      const finalAssessment = await Assessment.findById(assessment._id);
      const finalTaskStatus = await TaskStatus.findById(taskStatus._id);
      const finalUserProgress = await UserProgress.findById(userProgress._id);

      expect(finalAssessment.status).toBe('completed');
      expect(finalAssessment.score).toBe(85);
      expect(finalAssessment.passed).toBe(true);
      expect(finalTaskStatus.completed).toBe(true);
      expect(finalUserProgress.overallProgress).toBe(100);
      expect(finalUserProgress.points).toBe(150);
      expect(finalUserProgress.level).toBe('Explorer');
    });
  });

  describe('Assessment Flow', () => {
    test('should handle assessment start to completion', async () => {
      const userId = 'U1234567890';
      
      // Start assessment
      const assessment = new Assessment({
        userId,
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'in_progress',
        startedAt: new Date(),
        createdBy: 'system',
      });
      await assessment.save();

      // Simulate assessment completion
      assessment.status = 'completed';
      assessment.score = 92;
      assessment.passed = true;
      assessment.completedAt = new Date();
      await assessment.save();

      // Verify assessment completion
      const completedAssessment = await Assessment.findById(assessment._id);
      expect(completedAssessment.status).toBe('completed');
      expect(completedAssessment.score).toBe(92);
      expect(completedAssessment.passed).toBe(true);
    });

    test('should handle failed assessment', async () => {
      const userId = 'U1234567890';
      
      const assessment = new Assessment({
        userId,
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'in_progress',
        startedAt: new Date(),
        createdBy: 'system',
      });
      await assessment.save();

      // Simulate failed assessment
      assessment.status = 'failed';
      assessment.score = 65;
      assessment.passed = false;
      assessment.completedAt = new Date();
      assessment.attemptCount = 1;
      await assessment.save();

      // Verify failed assessment
      const failedAssessment = await Assessment.findById(assessment._id);
      expect(failedAssessment.status).toBe('failed');
      expect(failedAssessment.score).toBe(65);
      expect(failedAssessment.passed).toBe(false);
      expect(failedAssessment.attemptCount).toBe(1);
    });
  });

  describe('Gamification Flow', () => {
    test('should handle points and level progression', async () => {
      const userId = 'U1234567890';
      
      const userProgress = new UserProgress({
        userId,
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        points: 0,
        level: 'Rookie',
        status: 'active',
      });
      await userProgress.save();

      // Add points for various activities
      await userProgress.addPoints(50, 'Completed first task');
      expect(userProgress.points).toBe(50);
      expect(userProgress.level).toBe('Rookie');

      await userProgress.addPoints(100, 'Passed assessment');
      expect(userProgress.points).toBe(150);
      expect(userProgress.level).toBe('Explorer');

      await userProgress.addPoints(200, 'Completed week');
      expect(userProgress.points).toBe(350);
      expect(userProgress.level).toBe('Achiever');

      // Add badge
      await userProgress.addBadge({
        name: 'Test Badge',
        description: 'Test badge',
        category: 'test',
        icon: '🏆',
      });

      expect(userProgress.badges).toHaveLength(1);
      expect(userProgress.badges[0].name).toBe('Test Badge');
    });
  });

  describe('Manager Reporting Flow', () => {
    test('should generate manager report data', async () => {
      // Create test users
      const users = [
        {
          userId: 'U1',
          userName: 'User 1',
          email: 'user1@example.com',
          function: 'Engineering',
          subFunction: 'Backend',
          startDate: new Date(),
          status: 'active',
        },
        {
          userId: 'U2',
          userName: 'User 2',
          email: 'user2@example.com',
          function: 'Sales',
          subFunction: 'Enterprise',
          startDate: new Date(),
          status: 'active',
        },
      ];

      for (const user of users) {
        const userProgress = new UserProgress(user);
        await userProgress.save();

        // Create assessments
        const assessment = new Assessment({
          userId: user.userId,
          taskTitle: 'Fintech 101',
          weekIndex: 0,
          dayIndex: 1,
          taskIndex: 0,
          googleFormUrl: 'https://forms.gle/test',
          status: 'completed',
          score: 85,
          passed: true,
          createdBy: 'system',
        });
        await assessment.save();

        // Create task status
        const taskStatus = new TaskStatus({
          userId: user.userId,
          weekIndex: 0,
          dayIndex: 1,
          taskIndex: 0,
          completed: true,
        });
        await taskStatus.save();
      }

      // Verify data exists for reporting
      const allUsers = await UserProgress.find({ status: 'active' });
      const allAssessments = await Assessment.find({ status: 'completed' });
      const allTasks = await TaskStatus.find({ completed: true });

      expect(allUsers).toHaveLength(2);
      expect(allAssessments).toHaveLength(2);
      expect(allTasks).toHaveLength(2);
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Test with invalid data
      const invalidAssessment = new Assessment({
        // Missing required fields
        userId: 'U1234567890',
      });

      await expect(invalidAssessment.save()).rejects.toThrow();
    });

    test('should handle concurrent operations', async () => {
      const userId = 'U1234567890';
      
      const userProgress = new UserProgress({
        userId,
        userName: 'Test User',
        email: 'test@example.com',
        function: 'Engineering',
        subFunction: 'Backend',
        startDate: new Date(),
        status: 'active',
      });
      await userProgress.save();

      // Simulate concurrent point additions
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(userProgress.addPoints(10, `Test ${i}`));
      }

      await Promise.all(promises);

      expect(userProgress.points).toBe(50);
    });
  });
});
