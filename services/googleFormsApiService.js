/**
 * Google Forms API Integration Service
 * Handles direct integration with Google Forms API for better control
 */

const { google } = require('googleapis');
const axios = require('axios');

class GoogleFormsApiService {
    constructor() {
        this.forms = google.forms('v1');
        this.auth = null;
        this.initialized = false;
    }

    /**
     * Initialize Google Forms API with service account credentials
     */
    async initialize() {
        try {
            // Initialize with service account credentials
            this.auth = new google.auth.GoogleAuth({
                keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
                scopes: ['https://www.googleapis.com/auth/forms.body', 'https://www.googleapis.com/auth/forms.responses.readonly']
            });

            this.authClient = await this.auth.getClient();
            this.forms = google.forms({ version: 'v1', auth: this.authClient });
            this.initialized = true;
            
            console.log('Google Forms API initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Google Forms API:', error);
            this.initialized = false;
        }
    }

    /**
     * Create a custom assessment form programmatically
     */
    async createAssessmentForm(taskTitle, questions) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const form = {
                info: {
                    title: `${taskTitle} - Assessment`,
                    description: `Please complete this assessment for ${taskTitle}`,
                },
                items: questions.map((question, index) => ({
                    title: question.question,
                    questionItem: {
                        question: {
                            required: true,
                            choiceQuestion: {
                                type: 'RADIO',
                                options: question.options.map(option => ({
                                    value: option.value
                                })),
                                shuffle: false
                            }
                        }
                    }
                }))
            };

            const response = await this.forms.forms.create({
                requestBody: form
            });

            return {
                formId: response.data.formId,
                formUrl: response.data.responderUri,
                editUrl: response.data.editorUri
            };
        } catch (error) {
            console.error('Error creating assessment form:', error);
            throw error;
        }
    }

    /**
     * Get form responses and calculate score
     */
    async getFormResponses(formId) {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const response = await this.forms.forms.responses.list({
                formId: formId
            });

            return response.data.responses || [];
        } catch (error) {
            console.error('Error getting form responses:', error);
            throw error;
        }
    }

    /**
     * Calculate score from form responses
     */
    calculateScore(responses, correctAnswers) {
        if (!responses || responses.length === 0) {
            return { score: 0, totalQuestions: correctAnswers.length, passed: false };
        }

        const latestResponse = responses[responses.length - 1]; // Get most recent response
        const answers = latestResponse.answers;
        
        let correctCount = 0;
        const totalQuestions = correctAnswers.length;

        correctAnswers.forEach((correctAnswer, index) => {
            const questionKey = `question_${index}`;
            const userAnswer = answers[questionKey];
            
            if (userAnswer && userAnswer.textAnswers && userAnswer.textAnswers.answers) {
                const userAnswerText = userAnswer.textAnswers.answers[0].value;
                if (userAnswerText === correctAnswer) {
                    correctCount++;
                }
            }
        });

        const score = Math.round((correctCount / totalQuestions) * 100);
        const passed = score >= 80; // 80% passing threshold

        return {
            score,
            rawScore: correctCount,
            totalQuestions,
            passed,
            responses: responses.length
        };
    }
}

module.exports = new GoogleFormsApiService();
