/**
 * Question Bank API Routes
 * 
 * CRUD operations for managing assessment questions
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const express = require("express");
const Question = require("../models/question");
const authMiddleware = require("../utils/auth");

const router = express.Router();

/**
 * GET /api/questions
 * Get all questions with optional filtering
 */
router.get("/", async (req, res) => {
  try {
    const { assessment, difficulty, status, topic, search } = req.query;
    
    let query = {};
    
    if (assessment) query.assessment = assessment;
    if (difficulty) query.difficulty = difficulty;
    if (status) query.status = status;
    if (topic) query.topic = topic;
    if (search) {
      query.$or = [
        { question: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    const questions = await Question.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      count: questions.length,
      questions
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/questions/:id
 * Get a single question by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }
    
    res.json({ success: true, question });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/questions
 * Create a new question
 */
router.post("/", async (req, res) => {
  try {
    const questionData = req.body;
    
    // Validate required fields
    if (!questionData.question || !questionData.options || !questionData.correctAnswer || !questionData.assessment) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: question, options, correctAnswer, assessment" 
      });
    }
    
    const question = new Question(questionData);
    await question.save();
    
    console.log(`✅ Question created: ${question._id} for assessment: ${question.assessment}`);
    
    res.status(201).json({ 
      success: true, 
      message: "Question created successfully",
      question 
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/questions/:id
 * Update a question
 */
router.put("/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }
    
    // Create version before updating
    const modifiedBy = req.body.modifiedBy || "admin";
    question.createVersion(modifiedBy);
    
    // Update fields
    const updateFields = [
      'question', 'options', 'correctAnswer', 'explanation',
      'topic', 'tags', 'difficulty', 'points', 'status'
    ];
    
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        question[field] = req.body[field];
      }
    });
    
    await question.save();
    
    console.log(`✅ Question updated: ${question._id} (version ${question.version})`);
    
    res.json({ 
      success: true, 
      message: "Question updated successfully",
      question 
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/questions/:id
 * Delete a question (soft delete - archive)
 */
router.delete("/:id", async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, error: "Question not found" });
    }
    
    // Soft delete - change status to archived
    question.status = "archived";
    await question.save();
    
    console.log(`✅ Question archived: ${question._id}`);
    
    res.json({ 
      success: true, 
      message: "Question archived successfully" 
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/questions/bulk
 * Bulk create questions
 */
router.post("/bulk", async (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid input: questions must be a non-empty array" 
      });
    }
    
    const createdQuestions = await Question.insertMany(questions);
    
    console.log(`✅ Bulk created ${createdQuestions.length} questions`);
    
    res.status(201).json({ 
      success: true, 
      message: `${createdQuestions.length} questions created successfully`,
      count: createdQuestions.length,
      questions: createdQuestions
    });
  } catch (error) {
    console.error("Error bulk creating questions:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/questions/assessments/list
 * Get unique assessment names
 */
router.get("/assessments/list", async (req, res) => {
  try {
    const assessments = await Question.distinct("assessment");
    
    res.json({ 
      success: true, 
      assessments 
    });
  } catch (error) {
    console.error("Error fetching assessments:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/questions/stats/:assessment
 * Get statistics for an assessment
 */
router.get("/stats/:assessment", async (req, res) => {
  try {
    const { assessment } = req.params;
    
    const questions = await Question.find({ assessment, status: "active" });
    
    const stats = {
      total: questions.length,
      byDifficulty: {
        easy: questions.filter(q => q.difficulty === "easy").length,
        medium: questions.filter(q => q.difficulty === "medium").length,
        hard: questions.filter(q => q.difficulty === "hard").length
      },
      byTopic: {},
      averageSuccessRate: 0,
      totalUsage: 0
    };
    
    // Calculate by topic
    questions.forEach(q => {
      if (q.topic) {
        stats.byTopic[q.topic] = (stats.byTopic[q.topic] || 0) + 1;
      }
      stats.totalUsage += q.statistics.timesUsed;
    });
    
    // Calculate average success rate
    const totalAnswers = questions.reduce((sum, q) => 
      sum + q.statistics.correctAnswers + q.statistics.incorrectAnswers, 0);
    const totalCorrect = questions.reduce((sum, q) => 
      sum + q.statistics.correctAnswers, 0);
    
    stats.averageSuccessRate = totalAnswers > 0 
      ? Math.round((totalCorrect / totalAnswers) * 100) 
      : 0;
    
    res.json({ 
      success: true, 
      assessment,
      stats 
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

