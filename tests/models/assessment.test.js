/**
 * Assessment Model Tests
 * 
 * Comprehensive test suite for the Assessment Mongoose model.
 * Tests schema validation, field requirements, data types, and business logic.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const Assessment = require('../../models/assessment');

describe('Assessment Model', () => {
  /**
   * Schema Validation Tests
   * 
   * Tests the basic schema validation including required fields,
   * data types, and default values.
   */
  describe('Schema Validation', () => {
    test('should create a valid assessment with all required fields', async () => {
      const assessmentData = {
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'pending',
        passingScore: 80,
        maxAttempts: 3,
      };

      const assessment = new Assessment(assessmentData);
      const savedAssessment = await assessment.save();

      expect(savedAssessment._id).toBeDefined();
      expect(savedAssessment.userId).toBe(assessmentData.userId);
      expect(savedAssessment.taskTitle).toBe(assessmentData.taskTitle);
      expect(savedAssessment.status).toBe('pending');
    });

    test('should require userId', async () => {
      const assessmentData = {
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
      };

      const assessment = new Assessment(assessmentData);
      await expect(assessment.save()).rejects.toThrow();
    });

    test('should require taskTitle', async () => {
      const assessmentData = {
        userId: 'U1234567890',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
      };

      const assessment = new Assessment(assessmentData);
      await expect(assessment.save()).rejects.toThrow();
    });

    test('should set default values', async () => {
      const assessmentData = {
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
      };

      const assessment = new Assessment(assessmentData);
      const savedAssessment = await assessment.save();

      expect(savedAssessment.status).toBe('pending');
      expect(savedAssessment.passingScore).toBe(80);
      expect(savedAssessment.maxAttempts).toBe(3);
      expect(savedAssessment.attemptCount).toBe(0);
      expect(savedAssessment.createdAt).toBeDefined();
    });

    test('should validate status enum', async () => {
      const assessmentData = {
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'invalid_status',
      };

      const assessment = new Assessment(assessmentData);
      await expect(assessment.save()).rejects.toThrow();
    });

    test('should validate score range', async () => {
      const assessmentData = {
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        score: 150, // Invalid score > 100
      };

      const assessment = new Assessment(assessmentData);
      await expect(assessment.save()).rejects.toThrow();
    });
  });

  describe('Instance Methods', () => {
    test('should update status correctly', async () => {
      const assessment = new Assessment({
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
      });

      await assessment.save();
      assessment.status = 'completed';
      assessment.score = 85;
      assessment.passed = true;
      await assessment.save();

      expect(assessment.status).toBe('completed');
      expect(assessment.score).toBe(85);
      expect(assessment.passed).toBe(true);
    });
  });

  describe('Database Operations', () => {
    test('should find assessments by userId', async () => {
      const assessment1 = new Assessment({
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test1',
      });

      const assessment2 = new Assessment({
        userId: 'U1234567890',
        taskTitle: 'Core Payments',
        weekIndex: 0,
        dayIndex: 2,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test2',
      });

      await assessment1.save();
      await assessment2.save();

      const userAssessments = await Assessment.find({ userId: 'U1234567890' });
      expect(userAssessments).toHaveLength(2);
    });

    test('should find assessments by status', async () => {
      const completedAssessment = new Assessment({
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        status: 'completed',
        score: 85,
      });

      const pendingAssessment = new Assessment({
        userId: 'U0987654321',
        taskTitle: 'Core Payments',
        weekIndex: 0,
        dayIndex: 2,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test2',
        status: 'pending',
      });

      await completedAssessment.save();
      await pendingAssessment.save();

      const completedAssessments = await Assessment.find({ status: 'completed' });
      expect(completedAssessments).toHaveLength(1);
      expect(completedAssessments[0].score).toBe(85);
    });
  });
});
