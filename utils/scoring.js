/**
 * Mock scoring system for assessments
 * In a real implementation, this would integrate with Google Forms API
 * or another assessment platform to get actual scores
 */

const assessmentTopics = {
  "Fintech 101": {
    totalQuestions: 20,
    passingScore: 80,
    difficulty: "beginner",
    topics: ["fintech basics", "payment systems", "digital banking", "regulations"],
  },
  "Core Payments": {
    totalQuestions: 25,
    passingScore: 80,
    difficulty: "intermediate",
    topics: ["payment processing", "gateways", "merchants", "settlements"],
  },
  "Core Payments and Platform": {
    totalQuestions: 30,
    passingScore: 80,
    difficulty: "intermediate",
    topics: ["platform architecture", "payment flows", "APIs", "integration"],
  },
  "Merchant and Admin Dashboard": {
    totalQuestions: 20,
    passingScore: 80,
    difficulty: "beginner",
    topics: ["dashboard navigation", "merchant management", "admin functions", "reporting"],
  },
  "Recurring": {
    totalQuestions: 15,
    passingScore: 80,
    difficulty: "intermediate",
    topics: ["subscription models", "billing cycles", "payment methods", "cancellation"],
  },
  "Products 2.0": {
    totalQuestions: 25,
    passingScore: 80,
    difficulty: "advanced",
    topics: ["new features", "product roadmap", "technical specifications", "implementation"],
  },
  "Cross Border Payments": {
    totalQuestions: 20,
    passingScore: 80,
    difficulty: "advanced",
    topics: ["international payments", "compliance", "currency conversion", "regulations"],
  },
};

/**
 * Simulate scoring based on assessment topic and user performance
 * @param {string} taskTitle - The assessment topic
 * @param {Object} userData - User performance data (time spent, violations, etc.)
 * @returns {Object} - Score and pass/fail status
 */
function calculateScore(taskTitle, userData = {}) {
  const config = assessmentTopics[taskTitle];
  if (!config) {
    throw new Error(`Assessment configuration not found for: ${taskTitle}`);
  }

  // Base score calculation
  let baseScore = Math.floor(Math.random() * 40) + 40; // Random score between 40-80

  // Adjust score based on user performance
  const adjustments = {
    timeSpent: calculateTimeAdjustment(userData.timeSpent, config.totalQuestions),
    violations: calculateViolationPenalty(userData.violations || 0),
    attempts: calculateAttemptPenalty(userData.attemptCount || 1),
    difficulty: calculateDifficultyBonus(config.difficulty),
  };

  // Apply adjustments
  let finalScore = baseScore;
  finalScore += adjustments.timeSpent;
  finalScore -= adjustments.violations;
  finalScore -= adjustments.attempts;
  finalScore += adjustments.difficulty;

  // Ensure score is within valid range
  finalScore = Math.max(0, Math.min(100, finalScore));

  // Round to nearest integer
  finalScore = Math.round(finalScore);

  const passed = finalScore >= config.passingScore;

  return {
    score: finalScore,
    passed,
    passingScore: config.passingScore,
    totalQuestions: config.totalQuestions,
    adjustments: {
      timeSpent: adjustments.timeSpent,
      violations: adjustments.violations,
      attempts: adjustments.attempts,
      difficulty: adjustments.difficulty,
    },
    feedback: generateFeedback(finalScore, passed, adjustments),
  };
}

/**
 * Calculate time-based score adjustment
 * @param {number} timeSpent - Time spent in minutes
 * @param {number} totalQuestions - Total number of questions
 * @returns {number} - Score adjustment
 */
function calculateTimeAdjustment(timeSpent, totalQuestions) {
  if (!timeSpent) return 0;

  // Expected time: 2 minutes per question
  const expectedTime = totalQuestions * 2;
  const timeRatio = timeSpent / expectedTime;

  if (timeRatio < 0.5) {
    // Too fast - might be guessing
    return -5;
  } else if (timeRatio > 2) {
    // Too slow - might be struggling
    return -3;
  } else if (timeRatio >= 0.8 && timeRatio <= 1.2) {
    // Good timing
    return 5;
  }

  return 0;
}

/**
 * Calculate violation penalty
 * @param {number} violationCount - Number of violations
 * @returns {number} - Score penalty
 */
function calculateViolationPenalty(violationCount) {
  if (violationCount === 0) return 0;
  if (violationCount <= 2) return -5;
  if (violationCount <= 5) return -10;
  return -20; // Heavy penalty for many violations
}

/**
 * Calculate attempt penalty
 * @param {number} attemptCount - Number of attempts
 * @returns {number} - Score penalty
 */
function calculateAttemptPenalty(attemptCount) {
  if (attemptCount === 1) return 0;
  if (attemptCount === 2) return -3;
  if (attemptCount === 3) return -7;
  return -15; // Heavy penalty for many attempts
}

/**
 * Calculate difficulty bonus
 * @param {string} difficulty - Assessment difficulty level
 * @returns {number} - Score bonus
 */
function calculateDifficultyBonus(difficulty) {
  const bonuses = {
    beginner: 0,
    intermediate: 2,
    advanced: 5,
  };
  return bonuses[difficulty] || 0;
}

/**
 * Generate feedback based on score and performance
 * @param {number} score - Final score
 * @param {boolean} passed - Whether the assessment was passed
 * @param {Object} adjustments - Score adjustments
 * @returns {string} - Feedback message
 */
function generateFeedback(score, passed, adjustments) {
  let feedback = "";

  if (passed) {
    feedback = "Congratulations! You have successfully completed the assessment. ";
  } else {
    feedback = "Unfortunately, you did not achieve the required passing score. ";
  }

  // Add specific feedback based on performance
  if (adjustments.violations > 0) {
    feedback += "Please note that violations were detected during your assessment. ";
  }

  if (adjustments.attempts > 1) {
    feedback += `This was attempt ${adjustments.attempts + 1}. `;
  }

  if (adjustments.timeSpent > 0) {
    feedback += "Good job on managing your time effectively. ";
  } else if (adjustments.timeSpent < 0) {
    feedback += "Consider taking more time to read and understand the questions. ";
  }

  if (score >= 90) {
    feedback += "Excellent performance!";
  } else if (score >= 80) {
    feedback += "Good job!";
  } else if (score >= 70) {
    feedback += "You're on the right track, but consider reviewing the material more thoroughly.";
  } else {
    feedback += "Please review the course material and try again.";
  }

  return feedback;
}

/**
 * Simulate Google Forms integration
 * This would normally make an API call to Google Forms
 * @param {string} formUrl - Google Forms URL
 * @param {Object} responses - User responses
 * @returns {Promise<Object>} - Score and feedback
 */
async function simulateGoogleFormsScoring(formUrl, responses = {}) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  // Extract task title from form URL (in real implementation, this would be from form metadata)
  const taskTitle = extractTaskTitleFromUrl(formUrl);
  
  if (!taskTitle) {
    throw new Error("Could not determine assessment topic from form URL");
  }

  // Calculate score
  const result = calculateScore(taskTitle, responses);

  return {
    ...result,
    formUrl,
    submittedAt: new Date().toISOString(),
    processingTime: Math.floor(Math.random() * 5) + 1, // 1-5 seconds
  };
}

/**
 * Extract task title from Google Forms URL
 * This is a mock implementation - in reality, you'd need to map URLs to topics
 * @param {string} formUrl - Google Forms URL
 * @returns {string|null} - Task title or null if not found
 */
function extractTaskTitleFromUrl(formUrl) {
  // In a real implementation, you'd have a mapping of form URLs to task titles
  const urlMappings = {
    "fintech-101": "Fintech 101",
    "core-payments": "Core Payments",
    "core-payments-platform": "Core Payments and Platform",
    "merchant-admin-dashboard": "Merchant and Admin Dashboard",
    "recurring": "Recurring",
    "products-2-0": "Products 2.0",
    "cross-border-payments": "Cross Border Payments",
  };

  // For testing purposes, return a random topic
  // In real implementation, you'd look up the form ID in your database
  const topics = Object.keys(assessmentTopics);
  return topics[Math.floor(Math.random() * topics.length)];
}

module.exports = {
  calculateScore,
  simulateGoogleFormsScoring,
  assessmentTopics,
};
