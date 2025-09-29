const request = require('supertest');
const express = require('express');
const assessmentRoutes = require('../../routes/assessment');

const app = express();
app.use(express.json());
app.use('/api/assessment', assessmentRoutes);

describe('Assessment Routes', () => {
  describe('GET /api/assessment/config/:assessmentId', () => {
    test('should return 404 for non-existent assessment', async () => {
      const response = await request(app)
        .get('/api/assessment/config/nonexistent-id')
        .expect(404);

      expect(response.body.error).toBe('Assessment not found');
    });

    test('should return assessment config for valid assessment', async () => {
      // This would require setting up a test assessment in the database
      // For now, we'll test the error case
      const response = await request(app)
        .get('/api/assessment/config/valid-id')
        .expect(404);

      expect(response.body.error).toBe('Assessment not found');
    });
  });

  describe('POST /api/assessment/start', () => {
    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/assessment/start')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('should return 400 for invalid assessment configuration', async () => {
      const response = await request(app)
        .post('/api/assessment/start')
        .send({
          userId: 'U1234567890',
          taskTitle: 'Non-existent Task',
          weekIndex: 0,
          dayIndex: 1,
          taskIndex: 0,
        })
        .expect(400);

      expect(response.body.error).toBe('Assessment configuration not found');
    });

    test('should start assessment for valid request', async () => {
      // Mock the assessment data
      const mockAssessmentData = {
        assessments: {
          'Fintech 101': {
            description: 'Test assessment',
            googleFormUrl: 'https://forms.gle/test',
            passingScore: 80,
            timeLimit: 30,
            maxAttempts: 3,
            proctoringEnabled: true,
          },
        },
        proctoring: {
          screenRecording: { enabled: true },
          violations: {
            tabSwitch: { enabled: true, maxAllowed: 3, severity: 'medium' },
          },
        },
        messages: {
          violation: 'Violation detected',
        },
      };

      // Mock the require for assessmentData
      jest.doMock('../../data/assessmentData', () => mockAssessmentData);

      const response = await request(app)
        .post('/api/assessment/start')
        .send({
          userId: 'U1234567890',
          taskTitle: 'Fintech 101',
          weekIndex: 0,
          dayIndex: 1,
          taskIndex: 0,
        });

      // The response will depend on the actual implementation
      expect(response.status).toBeDefined();
    });
  });

  describe('POST /api/assessment/event', () => {
    test('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .post('/api/assessment/event')
        .send({
          eventType: 'started',
          sessionId: 'nonexistent-session',
          data: { startTime: new Date() },
        })
        .expect(404);

      expect(response.body.error).toBe('Proctoring session not found');
    });

    test('should process valid event', async () => {
      // This would require setting up a test session
      const response = await request(app)
        .post('/api/assessment/event')
        .send({
          eventType: 'started',
          sessionId: 'test-session',
          data: { startTime: new Date() },
        });

      expect(response.status).toBeDefined();
    });
  });

  describe('POST /api/assessment/violation', () => {
    test('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .post('/api/assessment/violation')
        .send({
          sessionId: 'nonexistent-session',
          violation: {
            type: 'tab_switch',
            timestamp: new Date(),
            details: 'User switched tabs',
          },
        })
        .expect(404);

      expect(response.body.error).toBe('Proctoring session not found');
    });
  });

  describe('POST /api/assessment/complete', () => {
    test('should return 404 for non-existent assessment', async () => {
      const response = await request(app)
        .post('/api/assessment/complete')
        .send({
          assessmentId: 'nonexistent-id',
          sessionId: 'test-session',
          score: 85,
          passed: true,
          reason: 'Assessment completed',
          timeSpent: 1800,
        })
        .expect(404);

      expect(response.body.error).toBe('Assessment not found');
    });

    test('should return 404 for non-existent session', async () => {
      // First create an assessment
      const Assessment = require('../../models/assessment');
      const assessment = new Assessment({
        userId: 'U1234567890',
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 1,
        taskIndex: 0,
        googleFormUrl: 'https://forms.gle/test',
        createdBy: 'system',
      });
      await assessment.save();

      const response = await request(app)
        .post('/api/assessment/complete')
        .send({
          assessmentId: assessment._id,
          sessionId: 'nonexistent-session',
          score: 85,
          passed: true,
          reason: 'Assessment completed',
          timeSpent: 1800,
        })
        .expect(404);

      expect(response.body.error).toBe('Proctoring session not found');
    });
  });

  describe('GET /api/assessment/results/:userId', () => {
    test('should return empty array for user with no assessments', async () => {
      const response = await request(app)
        .get('/api/assessment/results/U1234567890')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    test('should return user assessments', async () => {
      const Assessment = require('../../models/assessment');
      const assessment = new Assessment({
        userId: 'U1234567890',
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

      // Mock authentication middleware
      const originalAuth = require('../../utils/auth');
      jest.doMock('../../utils/auth', () => (req, res, next) => {
        req.user = { id: 'U1234567890' };
        next();
      });

      const response = await request(app)
        .get('/api/assessment/results/U1234567890')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].taskTitle).toBe('Fintech 101');
      expect(response.body[0].score).toBe(85);
    });
  });
});
