const { calculateScore, simulateGoogleFormsScoring, assessmentTopics } = require('../../utils/scoring');

describe('Scoring Utils', () => {
  describe('calculateScore', () => {
    test('should calculate score for Fintech 101', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 25,
        violations: 0,
        attemptCount: 1,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.passed).toBe(result.score >= 80);
      expect(result.passingScore).toBe(80);
      expect(result.totalQuestions).toBe(20);
      expect(result.feedback).toBeDefined();
    });

    test('should calculate score for Core Payments', () => {
      const result = calculateScore('Core Payments', {
        timeSpent: 45,
        violations: 2,
        attemptCount: 2,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.passed).toBe(result.score >= 80);
      expect(result.passingScore).toBe(80);
      expect(result.totalQuestions).toBe(25);
    });

    test('should throw error for unknown topic', () => {
      expect(() => {
        calculateScore('Unknown Topic', {});
      }).toThrow('Assessment configuration not found');
    });

    test('should apply time adjustments correctly', () => {
      const fastResult = calculateScore('Fintech 101', {
        timeSpent: 10, // Too fast
        violations: 0,
        attemptCount: 1,
      });

      const normalResult = calculateScore('Fintech 101', {
        timeSpent: 40, // Normal
        violations: 0,
        attemptCount: 1,
      });

      // Fast result should have penalty
      expect(fastResult.adjustments.timeSpent).toBeLessThanOrEqual(0);
      // Normal result should have bonus or no penalty
      expect(normalResult.adjustments.timeSpent).toBeGreaterThanOrEqual(0);
    });

    test('should apply violation penalties', () => {
      const noViolations = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 1,
      });

      const withViolations = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 3,
        attemptCount: 1,
      });

      expect(noViolations.adjustments.violations).toBe(0);
      expect(withViolations.adjustments.violations).toBeLessThan(0);
    });

    test('should apply attempt penalties', () => {
      const firstAttempt = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 1,
      });

      const secondAttempt = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 2,
      });

      expect(firstAttempt.adjustments.attempts).toBe(0);
      expect(secondAttempt.adjustments.attempts).toBeLessThan(0);
    });

    test('should apply difficulty bonuses', () => {
      const beginner = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 1,
      });

      const advanced = calculateScore('Cross Border Payments', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 1,
      });

      expect(beginner.adjustments.difficulty).toBe(0);
      expect(advanced.adjustments.difficulty).toBeGreaterThan(0);
    });
  });

  describe('simulateGoogleFormsScoring', () => {
    test('should simulate scoring with valid form URL', async () => {
      const result = await simulateGoogleFormsScoring('https://forms.gle/test', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 1,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.passed).toBe(result.score >= 80);
      expect(result.formUrl).toBe('https://forms.gle/test');
      expect(result.submittedAt).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    test('should handle different response data', async () => {
      const result1 = await simulateGoogleFormsScoring('https://forms.gle/test1', {
        timeSpent: 20,
        violations: 1,
        attemptCount: 2,
      });

      const result2 = await simulateGoogleFormsScoring('https://forms.gle/test2', {
        timeSpent: 50,
        violations: 0,
        attemptCount: 1,
      });

      expect(result1.score).toBeDefined();
      expect(result2.score).toBeDefined();
      expect(result1.formUrl).toBe('https://forms.gle/test1');
      expect(result2.formUrl).toBe('https://forms.gle/test2');
    });

    test('should have different scores for different inputs', async () => {
      const goodResult = await simulateGoogleFormsScoring('https://forms.gle/good', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 1,
      });

      const badResult = await simulateGoogleFormsScoring('https://forms.gle/bad', {
        timeSpent: 10,
        violations: 5,
        attemptCount: 3,
      });

      // Scores should be different due to different inputs
      expect(goodResult.score).not.toBe(badResult.score);
    });
  });

  describe('assessmentTopics', () => {
    test('should have all required topics', () => {
      const expectedTopics = [
        'Fintech 101',
        'Core Payments',
        'Core Payments and Platform',
        'Merchant and Admin Dashboard',
        'Recurring',
        'Products 2.0',
        'Cross Border Payments',
      ];

      expectedTopics.forEach(topic => {
        expect(assessmentTopics[topic]).toBeDefined();
        expect(assessmentTopics[topic].totalQuestions).toBeGreaterThan(0);
        expect(assessmentTopics[topic].passingScore).toBe(80);
        expect(assessmentTopics[topic].difficulty).toBeDefined();
        expect(assessmentTopics[topic].topics).toBeDefined();
        expect(Array.isArray(assessmentTopics[topic].topics)).toBe(true);
      });
    });

    test('should have valid difficulty levels', () => {
      Object.values(assessmentTopics).forEach(topic => {
        expect(['beginner', 'intermediate', 'advanced']).toContain(topic.difficulty);
      });
    });

    test('should have valid passing scores', () => {
      Object.values(assessmentTopics).forEach(topic => {
        expect(topic.passingScore).toBeGreaterThanOrEqual(0);
        expect(topic.passingScore).toBeLessThanOrEqual(100);
      });
    });

    test('should have valid question counts', () => {
      Object.values(assessmentTopics).forEach(topic => {
        expect(topic.totalQuestions).toBeGreaterThan(0);
        expect(topic.totalQuestions).toBeLessThan(100);
      });
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero time spent', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 0,
        violations: 0,
        attemptCount: 1,
      });

      expect(result.score).toBeDefined();
      expect(result.adjustments.timeSpent).toBe(0);
    });

    test('should handle high violation count', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 10,
        attemptCount: 1,
      });

      expect(result.score).toBeDefined();
      expect(result.adjustments.violations).toBeLessThan(0);
    });

    test('should handle high attempt count', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 5,
      });

      expect(result.score).toBeDefined();
      expect(result.adjustments.attempts).toBeLessThan(0);
    });

    test('should handle very long time spent', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 200, // Very long
        violations: 0,
        attemptCount: 1,
      });

      expect(result.score).toBeDefined();
      expect(result.adjustments.timeSpent).toBeLessThan(0);
    });
  });

  describe('Feedback Generation', () => {
    test('should generate appropriate feedback for passed assessment', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 1,
      });

      if (result.passed) {
        expect(result.feedback).toContain('Congratulations');
      } else {
        expect(result.feedback).toContain('Unfortunately');
      }
    });

    test('should mention violations in feedback', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 2,
        attemptCount: 1,
      });

      if (result.adjustments.violations < 0) {
        expect(result.feedback).toContain('violations');
      }
    });

    test('should mention attempts in feedback', () => {
      const result = calculateScore('Fintech 101', {
        timeSpent: 30,
        violations: 0,
        attemptCount: 3,
      });

      if (result.adjustments.attempts < 0) {
        expect(result.feedback).toContain('attempt');
      }
    });
  });
});
