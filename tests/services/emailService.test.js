/**
 * Email Service Tests
 * Tests for email notification functionality
 */

const emailService = require('../../services/emailService');

describe('Email Service', () => {
  describe('Initialization', () => {
    test('should initialize email service', () => {
      expect(emailService).toBeDefined();
      expect(emailService.transporter).toBeDefined();
    });

    test('should have sendAssessmentCompletionEmail method', () => {
      expect(typeof emailService.sendAssessmentCompletionEmail).toBe('function');
    });

    test('should have sendNotification method', () => {
      expect(typeof emailService.sendNotification).toBe('function');
    });
  });

  describe('Email Templates', () => {
    test('should generate passed email template', () => {
      const template = emailService.getPassedEmailTemplate('John Doe', 'Fintech 101', '11/13 (84%)');
      
      expect(template).toContain('John Doe');
      expect(template).toContain('Fintech 101');
      expect(template).toContain('11/13 (84%)');
      expect(template).toContain('Congratulations');
      expect(template).toContain('PASSED');
    });

    test('should generate failed email template', () => {
      const template = emailService.getFailedEmailTemplate('Jane Smith', 'Core Payments', '8/13 (61%)');
      
      expect(template).toContain('Jane Smith');
      expect(template).toContain('Core Payments');
      expect(template).toContain('8/13 (61%)');
      expect(template).toContain('80%'); // Passing score
    });

    test('should generate plain text version', () => {
      const text = emailService.getPlainTextVersion('John', 'Test', '10/10 (100%)', true);
      
      expect(text).toContain('John');
      expect(text).toContain('Test');
      expect(text).toContain('10/10 (100%)');
      expect(text).toContain('PASSED');
    });
  });

  describe('Email Sending (Mocked)', () => {
    // Note: Actual email sending requires SMTP configuration
    // These tests verify the data structure, not actual sending

    test('should prepare assessment completion email data', async () => {
      const assessmentData = {
        taskTitle: 'Fintech 101',
        score: 85,
        rawScore: 11,
        totalQuestions: 13,
        passed: true
      };

      // Mock the transporter
      const originalSendMail = emailService.transporter.sendMail;
      let capturedMailOptions;
      
      emailService.transporter.sendMail = async (options) => {
        capturedMailOptions = options;
        return { messageId: 'test-message-id' };
      };

      const result = await emailService.sendAssessmentCompletionEmail(
        'test@example.com',
        'Test User',
        assessmentData
      );

      // Restore original
      emailService.transporter.sendMail = originalSendMail;

      expect(result.success).toBe(true);
      expect(capturedMailOptions).toBeDefined();
      expect(capturedMailOptions.to).toBe('test@example.com');
      expect(capturedMailOptions.subject).toContain('Passed');
      expect(capturedMailOptions.html).toContain('Test User');
      expect(capturedMailOptions.html).toContain('Fintech 101');
    });

    test('should handle email sending errors gracefully', async () => {
      // Mock transporter to throw error
      const originalSendMail = emailService.transporter.sendMail;
      
      emailService.transporter.sendMail = async () => {
        throw new Error('SMTP connection failed');
      };

      const result = await emailService.sendAssessmentCompletionEmail(
        'test@example.com',
        'Test User',
        { taskTitle: 'Test', score: 80, passed: true }
      );

      // Restore original
      emailService.transporter.sendMail = originalSendMail;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Email Content Validation', () => {
    test('should include all required information in passed email', () => {
      const template = emailService.getPassedEmailTemplate('User', 'Assessment', '10/10 (100%)');
      
      expect(template).toContain('<html'); // Valid HTML
      expect(template).toContain('User');
      expect(template).toContain('Assessment');
      expect(template).toContain('10/10 (100%)');
      expect(template).toContain('✅'); // Or similar success indicator
    });

    test('should include encouragement in failed email', () => {
      const template = emailService.getFailedEmailTemplate('User', 'Assessment', '5/10 (50%)');
      
      expect(template).toContain('User');
      expect(template).toContain('Assessment');
      expect(template).toContain('5/10 (50%)');
      expect(template).toContain('80%'); // Passing score
      // Should have encouraging language
      expect(template.toLowerCase()).toMatch(/try again|review|learn|prepare/);
    });
  });
});

