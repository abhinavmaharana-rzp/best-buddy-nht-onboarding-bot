/**
 * End-to-End Proctored Assessment Tests
 * Tests the complete user journey through a proctored assessment
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
  
  app = express();
  app.use(express.json());
  app.use('/api/assessment', assessmentRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('E2E: Proctored Assessment Journey', () => {
  const userId = 'U_E2E_TEST_USER';
  let assessmentId, sessionId;

  test('User Story: Complete successful assessment with violations', async () => {
    console.log('\n=== E2E Test: Complete Assessment Journey ===\n');

    // STEP 1: User starts assessment
    console.log('Step 1: Starting assessment...');
    const startResponse = await request(app)
      .post('/api/assessment/start')
      .send({
        userId: userId,
        taskTitle: 'Fintech 101',
        weekIndex: 0,
        dayIndex: 0,
        taskIndex: 0,
        browser: 'Chrome',
        os: 'MacOS',
        screenResolution: '1920x1080'
      })
      .expect(200);

    assessmentId = startResponse.body.assessmentId;
    sessionId = startResponse.body.sessionId;
    
    expect(assessmentId).toBeDefined();
    expect(sessionId).toBeDefined();
    console.log(`✅ Assessment started: ${assessmentId}`);
    console.log(`✅ Session created: ${sessionId}`);

    // STEP 2: User answers questions (simulated)
    console.log('\nStep 2: User answering questions...');
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate time

    // STEP 3: Violation detected - tab switch
    console.log('\nStep 3: Violation detected (tab switch)...');
    await request(app)
      .post('/api/assessment/violation')
      .send({
        sessionId: sessionId,
        violation: {
          type: 'tab_switch',
          description: 'User switched to another tab',
          timestamp: new Date(),
          severity: 'medium'
        }
      })
      .expect(200);

    console.log('✅ Violation logged');

    // STEP 4: Another violation - looking away
    console.log('\nStep 4: AI detects looking away...');
    await request(app)
      .post('/api/assessment/violation')
      .send({
        sessionId: sessionId,
        violation: {
          type: 'looking_away',
          description: 'User looking away from screen',
          timestamp: new Date(),
          severity: 'low'
        }
      })
      .expect(200);

    console.log('✅ Face detection violation logged');

    // STEP 5: Heartbeat events
    console.log('\nStep 5: Sending heartbeat...');
    await request(app)
      .post('/api/assessment/event')
      .send({
        sessionId: sessionId,
        eventType: 'heartbeat',
        data: { timestamp: new Date() }
      })
      .expect(200);

    console.log('✅ Heartbeat logged');

    // STEP 6: Complete assessment with passing score
    console.log('\nStep 6: Completing assessment...');
    const completeResponse = await request(app)
      .post('/api/assessment/complete')
      .send({
        assessmentId: assessmentId,
        sessionId: sessionId,
        score: 85,
        rawScore: 11,
        totalQuestions: 13,
        passed: true,
        timeSpent: 28,
        violations: 2,
        completedAt: new Date().toISOString()
      })
      .expect(200);

    expect(completeResponse.body.success).toBe(true);
    expect(completeResponse.body.score).toBe(85);
    expect(completeResponse.body.passed).toBe(true);
    console.log('✅ Assessment completed successfully');

    // STEP 7: Verify final state
    console.log('\nStep 7: Verifying final state...');
    
    const finalAssessment = await Assessment.findById(assessmentId);
    expect(finalAssessment.status).toBe('completed');
    expect(finalAssessment.score).toBe(85);
    expect(finalAssessment.passed).toBe(true);
    expect(finalAssessment.violations).toBe(2);
    
    const finalSession = await ProctoringSession.findOne({ sessionId });
    expect(finalSession.status).toBe('completed');
    expect(finalSession.violations.length).toBe(2);
    expect(finalSession.endTime).toBeDefined();
    
    console.log('✅ All data persisted correctly');
    console.log('\n=== E2E Test Complete: PASSED ===\n');
  });

  test('User Story: Failed assessment with too many violations', async () => {
    console.log('\n=== E2E Test: Failed Assessment ===\n');

    // Start new assessment
    const startResponse = await request(app)
      .post('/api/assessment/start')
      .send({
        userId: userId + '_fail',
        taskTitle: 'Core Payments',
        weekIndex: 1,
        dayIndex: 0,
        taskIndex: 0
      })
      .expect(200);

    const failAssessmentId = startResponse.body.assessmentId;
    const failSessionId = startResponse.body.sessionId;

    // Multiple violations
    const violations = [
      { type: 'tab_switch', severity: 'medium' },
      { type: 'copy_paste', severity: 'high' },
      { type: 'no_face_detected', severity: 'high' },
      { type: 'multiple_faces', severity: 'high' }
    ];

    for (const v of violations) {
      await request(app)
        .post('/api/assessment/violation')
        .send({
          sessionId: failSessionId,
          violation: { ...v, description: v.type, timestamp: new Date() }
        })
        .expect(200);
    }

    // Complete with failing score
    const completeResponse = await request(app)
      .post('/api/assessment/complete')
      .send({
        assessmentId: failAssessmentId,
        sessionId: failSessionId,
        score: 65,
        rawScore: 6,
        totalQuestions: 10,
        passed: false,
        timeSpent: 30,
        violations: 4,
        completedAt: new Date().toISOString()
      })
      .expect(200);

    expect(completeResponse.body.passed).toBe(false);

    // Verify state
    const assessment = await Assessment.findById(failAssessmentId);
    expect(assessment.status).toBe('failed');
    expect(assessment.score).toBe(65);
    expect(assessment.violations).toBe(4);

    console.log('✅ Failed assessment flow complete');
  });

  test('User Story: Practice mode (no proctoring)', async () => {
    console.log('\n=== E2E Test: Practice Mode ===\n');

    const response = await request(app)
      .post('/api/assessment/practice')
      .send({ taskTitle: 'Fintech 101' })
      .expect(200);

    expect(response.body.mode).toBe('practice');
    expect(response.body.config.proctoringEnabled).toBe(false);
    expect(response.body.config.questions).toBeDefined();

    // Practice mode should not create database records
    const sessions = await ProctoringSession.find({ 
      sessionId: response.body.sessionId 
    });
    expect(sessions.length).toBe(0); // No proctoring session

    console.log('✅ Practice mode working correctly');
  });

  describe('Edge Cases', () => {
    test('should handle concurrent assessment start', async () => {
      await Assessment.findByIdAndUpdate(assessmentId, { status: 'in_progress' });

      const response = await request(app)
        .post('/api/assessment/start')
        .send({
          userId: userId,
          taskTitle: 'Fintech 101',
          weekIndex: 0,
          dayIndex: 0,
          taskIndex: 0
        })
        .expect(400);

      expect(response.body.error).toContain('in progress');
    });

    test('should handle invalid session ID in violation', async () => {
      const response = await request(app)
        .post('/api/assessment/violation')
        .send({
          sessionId: 'invalid_session',
          violation: { type: 'tab_switch', timestamp: new Date() }
        })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    test('should handle malformed completion data', async () => {
      const response = await request(app)
        .post('/api/assessment/complete')
        .send({
          assessmentId: 'invalid_id',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Recording Retrieval', () => {
    test('should get all sessions for admin', async () => {
      const response = await request(app)
        .get('/api/assessment/sessions/all')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should get session details', async () => {
      const response = await request(app)
        .get(`/api/assessment/sessions/${sessionId}/details`)
        .expect(200);

      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.userId).toBe(userId);
      expect(response.body.violations).toBeDefined();
      expect(response.body.assessment).toBeDefined();
    });
  });
});

