/**
 * Question Routes Tests
 * Tests for question bank CRUD API endpoints
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const express = require('express');
const questionsRouter = require('../../routes/questions');
const Question = require('../../models/question');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  // Setup express app for testing
  app = express();
  app.use(express.json());
  app.use('/api/questions', questionsRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Question Routes', () => {
  let createdQuestionId;

  describe('POST /api/questions', () => {
    test('should create a new question', async () => {
      const questionData = {
        question: 'What is UPI?',
        options: ['Protocol', 'Payment system', 'Bank', 'Card'],
        correctAnswer: 'Payment system',
        explanation: 'UPI is a unified payment interface',
        assessment: 'Fintech 101',
        difficulty: 'easy',
        topic: 'Digital Payments'
      };

      const response = await request(app)
        .post('/api/questions')
        .send(questionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.question).toBeDefined();
      expect(response.body.question.question).toBe(questionData.question);
      
      createdQuestionId = response.body.question._id;
    });

    test('should reject question without required fields', async () => {
      const response = await request(app)
        .post('/api/questions')
        .send({
          question: 'Incomplete question'
          // Missing options, correctAnswer, assessment
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required fields');
    });
  });

  describe('GET /api/questions', () => {
    beforeAll(async () => {
      // Create test questions
      await Question.create([
        {
          question: 'Test Q1',
          options: ['A', 'B'],
          correctAnswer: 'A',
          assessment: 'Test Assessment',
          difficulty: 'easy',
          status: 'active'
        },
        {
          question: 'Test Q2',
          options: ['A', 'B'],
          correctAnswer: 'A',
          assessment: 'Test Assessment',
          difficulty: 'hard',
          status: 'active'
        }
      ]);
    });

    test('should get all questions', async () => {
      const response = await request(app)
        .get('/api/questions')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.questions).toBeDefined();
      expect(Array.isArray(response.body.questions)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    test('should filter by assessment', async () => {
      const response = await request(app)
        .get('/api/questions?assessment=Test Assessment')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.questions.every(q => q.assessment === 'Test Assessment')).toBe(true);
    });

    test('should filter by difficulty', async () => {
      const response = await request(app)
        .get('/api/questions?difficulty=easy')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.questions.every(q => q.difficulty === 'easy')).toBe(true);
    });

    test('should search questions', async () => {
      const response = await request(app)
        .get('/api/questions?search=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.questions.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/questions/:id', () => {
    test('should get question by ID', async () => {
      const response = await request(app)
        .get(`/api/questions/${createdQuestionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.question).toBeDefined();
      expect(response.body.question._id).toBe(createdQuestionId);
    });

    test('should return 404 for non-existent question', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/questions/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/questions/:id', () => {
    test('should update a question', async () => {
      const updates = {
        question: 'Updated question?',
        difficulty: 'hard',
        modifiedBy: 'test-admin'
      };

      const response = await request(app)
        .put(`/api/questions/${createdQuestionId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.question.question).toBe(updates.question);
      expect(response.body.question.difficulty).toBe('hard');
      expect(response.body.question.version).toBe(2); // Version incremented
    });

    test('should return 404 for non-existent question', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/questions/${fakeId}`)
        .send({ question: 'Update' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/questions/:id', () => {
    test('should archive (soft delete) a question', async () => {
      const response = await request(app)
        .delete(`/api/questions/${createdQuestionId}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify it's archived, not deleted
      const question = await Question.findById(createdQuestionId);
      expect(question).toBeDefined();
      expect(question.status).toBe('archived');
    });

    test('should return 404 for non-existent question', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .delete(`/api/questions/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/questions/bulk', () => {
    test('should create multiple questions', async () => {
      const questions = [
        {
          question: 'Bulk Q1',
          options: ['A', 'B'],
          correctAnswer: 'A',
          assessment: 'Bulk Test'
        },
        {
          question: 'Bulk Q2',
          options: ['A', 'B'],
          correctAnswer: 'A',
          assessment: 'Bulk Test'
        }
      ];

      const response = await request(app)
        .post('/api/questions/bulk')
        .send({ questions })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.questions).toHaveLength(2);
    });

    test('should reject invalid bulk data', async () => {
      const response = await request(app)
        .post('/api/questions/bulk')
        .send({ questions: 'not an array' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/questions/assessments/list', () => {
    test('should get unique assessment names', async () => {
      const response = await request(app)
        .get('/api/questions/assessments/list')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.assessments)).toBe(true);
    });
  });

  describe('GET /api/questions/stats/:assessment', () => {
    test('should get assessment statistics', async () => {
      const response = await request(app)
        .get('/api/questions/stats/Test Assessment')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toBeDefined();
      expect(response.body.stats.total).toBeGreaterThanOrEqual(0);
      expect(response.body.stats.byDifficulty).toBeDefined();
    });
  });
});

