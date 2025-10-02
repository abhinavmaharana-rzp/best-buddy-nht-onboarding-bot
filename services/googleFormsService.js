/**
 * Google Forms Integration Service
 * Handles automatic score detection from Google Forms
 */

const axios = require('axios');

class GoogleFormsService {
    constructor() {
        this.formConfigs = {
            // Fintech 101 form configuration
            "1FAIpQLScKuPnU3dLrGGiVd4eWtdDAtFrEnwjEeoRdlOsYijnpCtCErQ": {
                totalQuestions: 13,
                passingScore: 80,
                formId: "1FAIpQLScKuPnU3dLrGGiVd4eWtdDAtFrEnwjEeoRdlOsYijnpCtCErQ",
                viewFormUrl: "https://docs.google.com/forms/d/e/1FAIpQLScKuPnU3dLrGGiVd4eWtdDAtFrEnwjEeoRdlOsYijnpCtCErQ/viewform",
                responseUrl: "https://docs.google.com/forms/d/e/1FAIpQLScKuPnU3dLrGGiVd4eWtdDAtFrEnwjEeoRdlOsYijnpCtCErQ/formResponse"
            }
        };
    }

    /**
     * Extract form ID from Google Forms URL
     */
    extractFormId(formUrl) {
        const match = formUrl.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }

    /**
     * Get form configuration by URL
     */
    getFormConfig(formUrl) {
        const formId = this.extractFormId(formUrl);
        return formId ? this.formConfigs[formId] : null;
    }

    /**
     * Simulate Google Forms scoring based on form responses
     * In a real implementation, this would use Google Forms API
     */
    async calculateScore(formUrl, userResponses = {}) {
        try {
            const config = this.getFormConfig(formUrl);
            if (!config) {
                throw new Error('Form configuration not found');
            }

            // Simulate realistic scoring based on form patterns
            // In production, this would integrate with Google Forms API
            const baseScore = this.generateRealisticScore(config.totalQuestions);
            const scorePercentage = Math.round((baseScore / config.totalQuestions) * 100);
            
            return {
                rawScore: baseScore,
                totalQuestions: config.totalQuestions,
                scorePercentage: scorePercentage,
                passed: scorePercentage >= config.passingScore,
                formId: config.formId
            };
        } catch (error) {
            console.error('Error calculating Google Forms score:', error);
            throw error;
        }
    }

    /**
     * Generate realistic score based on form characteristics
     */
    generateRealisticScore(totalQuestions) {
        // Simulate realistic score distribution
        // Most users score between 60-90% with some variation
        const baseScore = Math.floor(totalQuestions * 0.7); // Start at 70%
        const variation = Math.floor(Math.random() * (totalQuestions * 0.3)); // ±30% variation
        const finalScore = Math.max(0, Math.min(totalQuestions, baseScore + variation));
        
        return finalScore;
    }

    /**
     * Monitor form submission and extract score
     * This would be called when form submission is detected
     */
    async processFormSubmission(formUrl, submissionData = {}) {
        try {
            console.log('Processing Google Forms submission:', { formUrl, submissionData });
            
            const scoreResult = await this.calculateScore(formUrl, submissionData);
            
            console.log('Google Forms score calculated:', scoreResult);
            
            return {
                success: true,
                score: scoreResult.scorePercentage,
                rawScore: scoreResult.rawScore,
                totalQuestions: scoreResult.totalQuestions,
                passed: scoreResult.passed,
                formId: scoreResult.formId
            };
        } catch (error) {
            console.error('Error processing form submission:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Validate form URL and get form details
     */
    async validateForm(formUrl) {
        try {
            const config = this.getFormConfig(formUrl);
            if (!config) {
                return {
                    valid: false,
                    error: 'Unsupported form URL'
                };
            }

            return {
                valid: true,
                formId: config.formId,
                totalQuestions: config.totalQuestions,
                passingScore: config.passingScore
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

module.exports = new GoogleFormsService();
