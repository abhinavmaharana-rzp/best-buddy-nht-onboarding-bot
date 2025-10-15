/**
 * Assessment Flow Integration Tests
 * Tests the complete assessment flow from start to completion
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const assessmentRouter = require('../../routes/assessment');
const Assessment = require('../../models/assessment');
const ProctoringSession = require('../../models/proctoringSession');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Setup express app
  app = express();
  app.use(express.json());
  app.use('/api/assessment', assessmentRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Assessment Flow Integration Tests', () => {
  let assessmentId;
  let sessionId;
  const testUserId = 'U_TEST_USER';

  describe('Complete Assessment Lifecycle', () => {
    test('Step 1: Start assessment', async () => {
      const response = await request(app)
        .post('/api/assessment/start')
        .send({
          userId: testUserId,
          taskTitle: 'Fintech 101',
          weekIndex: 0,
          dayIndex: 0,
          taskIndex: 0
        })
        .expect(200);

      expect(response.body.assessmentId).toBeDefined();
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.config).toBeDefined();
      expect(response.body.config.questions).toBeDefined();

      assessmentId = response.body.assessmentId;
      sessionId = response.body.sessionId;
    });

    test('Step 2: Verify assessment created in database', async () => {
      const assessment = await Assessment.findById(assessmentId);
      
      expect(assessment).toBeDefined();
      expect(assessment.userId).toBe(testUserId);
      expect(assessment.taskTitle).toBe('Fintech 101');
      expect(assessment.status).toBe('in_progress');
      expect(assessment.attemptCount).toBe(1);
    });

    test('Step 3: Verify proctoring session created', async () => {
      const session = await ProctoringSession.findOne({ sessionId });
      
      expect(session).toBeDefined();
      expect(session.userId).toBe(testUserId);
      expect(session.assessmentId.toString()).toBe(assessmentId);
      expect(session.status).toBe('active');
    });

    test('Step 4: Log violation during assessment', async () => {
      const response = await request(app)
        .post('/api/assessment/violation')
        .send({
          sessionId: sessionId,
          violation: {
            type: 'tab_switch',
            description: 'User switched tabs',
            timestamp: new Date(),
            severity: 'medium'
          }
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify violation recorded
      const session = await ProctoringSession.findOne({ sessionId });
      expect(session.violations.length).toBe(1);
      expect(session.violations[0].type).toBe('tab_switch');
    });

    test('Step 5: Log assessment event', async () => {
      const response = await request(app)
        .post('/api/assessment/event')
        .send({
          sessionId: sessionId,
          eventType: 'heartbeat',
          data: { timestamp: new Date() }
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('Step 6: Complete assessment', async () => {
      const response = await request(app)
        .post('/api/assessment/complete')
        .send({
          assessmentId: assessmentId,
          sessionId: sessionId,
          score: 85,
          rawScore: 11,
          totalQuestions: 13,
          passed: true,
          timeSpent: 25,
          violations: 1,
          completedAt: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.score).toBe(85);
      expect(response.body.passed).toBe(true);
    });

    test('Step 7: Verify assessment marked as completed', async () => {
      const assessment = await Assessment.findById(assessmentId);
      
      expect(assessment.status).toBe('completed');
      expect(assessment.score).toBe(85);
      expect(assessment.passed).toBe(true);
      expect(assessment.rawScore).toBe(11);
      expect(assessment.totalQuestions).toBe(13);
      expect(assessment.completedAt).toBeDefined();
    });

    test('Step 8: Verify proctoring session closed', async () => {
      const session = await ProctoringSession.findOne({ sessionId });
      
      expect(session.status).toBe('completed');
      expect(session.endTime).toBeDefined();
    });
  });

  describe('Practice Mode Flow', () => {
    test('should start practice assessment', async () => {
      const response = await request(app)
        .post('/api/assessment/practice')
        .send({ taskTitle: 'Fintech 101' })
        .expect(200);

      expect(response.body.mode).toBe('practice');
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.config).toBeDefined();
      expect(response.body.config.proctoringEnabled).toBe(false);
    });

    test('should reject practice mode without task title', async () => {
      const response = await request(app)
        .post('/api/assessment/practice')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Assessment Configuration', () => {
    test('should get assessment config', async () => {
      const response = await request(app)
        .get(`/api/assessment/config/${assessmentId}`)
        .expect(200);

      expect(response.body.assessmentId).toBe(assessmentId);
      expect(response.body.taskTitle).toBe('Fintech 101');
      expect(response.body.questions).toBeDefined();
      expect(response.body.passingScore).toBe(80);
    });

    test('should return 404 for invalid assessment ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/assessment/config/${fakeId}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Multiple Attempts', () => {
    test('should allow retake if under max attempts', async () => {
      const response = await request(app)
        .post('/api/assessment/start')
        .send({
          userId: testUserId,
          taskTitle: 'Fintech 101',
          weekIndex: 0,
          dayIndex: 0,
          taskIndex: 0
        })
        .expect(200);

      expect(response.body.assessmentId).toBeDefined();

      // Check attempt count increased
      const assessment = await Assessment.findById(response.body.assessmentId);
      expect(assessment.attemptCount).toBe(2);
    });

    test('should prevent exceeding max attempts', async () => {
      // Set attempt count to max
      await Assessment.findByIdAndUpdate(assessmentId, { attemptCount: 3 });

      const response = await request(app)
        .post('/api/assessment/start')
        .send({
          userId: testUserId,
          taskTitle: 'Fintech 101',
          weekIndex: 0,
          dayIndex: 0,
          taskIndex: 0
        })
        .expect(400);

      expect(response.body.error).toContain('Maximum attempts');
    });
  });

  describe('Violation Tracking', () => {
    test('should track multiple violations', async () => {
      const violations = [
        { type: 'tab_switch', description: 'Switched tab', severity: 'medium' },
        { type: 'copy_paste', description: 'Copy detected', severity: 'high' },
        { type: 'no_face_detected', description: 'No face', severity: 'high' }
      ];

      for (const violation of violations) {
        await request(app)
          .post('/api/assessment/violation')
          .send({
            sessionId: sessionId,
            violation: { ...violation, timestamp: new Date() }
          })
          .expect(200);
      }

      const session = await ProctoringSession.findOne({ sessionId });
      expect(session.violations.length).toBeGreaterThanOrEqual(3);
    });

    test('should record violation timestamps', async () => {
      const session = await ProctoringSession.findOne({ sessionId });
      
      session.violations.forEach(v => {
        expect(v.timestamp).toBeDefined();
        expect(v.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Assessment Data Retrieval', () => {
    test('should get assessment data config', async () => {
      const response = await request(app)
        .get('/api/assessment/data')
        .expect(200);

      expect(response.body.proctoring).toBeDefined();
      expect(response.body.messages).toBeDefined();
    });

    test('should get admin assessments list', async () => {
      const response = await request(app)
        .get('/api/assessment/admin/assessments')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Health Check', () => {
    test('should return health status with storage info', async () => {
      const response = await request(app)
        .get('/api/assessment/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.storage).toBeDefined();
      expect(response.body.storage.type).toBeDefined();
    });
  });
});

