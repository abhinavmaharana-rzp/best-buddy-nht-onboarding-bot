/**
 * Test Email Report Script
 * 
 * This script tests the email reporting functionality by sending
 * a sample report to abhinav.maharana@razorpay.com
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

require("dotenv").config();
const { App } = require("@slack/bolt");
const ReportingService = require("./services/reportingService");

async function testEmailReport() {
  try {
    console.log("🚀 Starting email report test...");
    
    // Initialize Slack app (minimal config for testing)
    const app = new App({
      token: process.env.SLACK_BOT_TOKEN || "dummy-token",
      signingSecret: process.env.SLACK_SIGNING_SECRET || "dummy-secret",
      socketMode: false, // We don't need socket mode for this test
    });
    
    // Initialize reporting service
    const reportingService = new ReportingService(app);
    
    // Create a sample report
    const sampleReport = {
      _id: "test-report-123",
      managerId: "U_ABHINAV_MAHARANA",
      reportDate: new Date(),
      reportType: "weekly",
      summary: {
        totalNewHires: 5,
        averageProgress: 75.5,
        assessmentsPassed: 12,
        assessmentsFailed: 3,
        topPerformers: ["U1234567890", "U0987654321"],
        needsAttention: ["U1111111111"],
        overallHealth: "good"
      },
      newHires: [
        {
          userId: "U1234567890",
          userName: "John Doe",
          email: "john.doe@razorpay.com",
          function: "Engineering",
          subFunction: "Backend",
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          progress: {
            overallPercentage: 85,
            tasksCompleted: 12,
            totalTasks: 15,
            assessmentsCompleted: 3,
            totalAssessments: 4,
            averageScore: 88
          },
          assessments: [
            {
              taskTitle: "Fintech 101",
              score: 92,
              passed: true,
              completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              attemptCount: 1
            },
            {
              taskTitle: "Core Payments",
              score: 85,
              passed: true,
              completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              attemptCount: 1
            }
          ],
          concerns: []
        },
        {
          userId: "U0987654321",
          userName: "Jane Smith",
          email: "jane.smith@razorpay.com",
          function: "Sales",
          subFunction: "SDR",
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
          progress: {
            overallPercentage: 65,
            tasksCompleted: 8,
            totalTasks: 12,
            assessmentsCompleted: 2,
            totalAssessments: 3,
            averageScore: 72
          },
          assessments: [
            {
              taskTitle: "Product Knowledge",
              score: 78,
              passed: true,
              completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              attemptCount: 1
            }
          ],
          concerns: [
            {
              type: "low_performance",
              description: "Below average assessment scores",
              severity: "medium",
              timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
            }
          ]
        }
      ],
      recommendations: [
        {
          type: "additional_training",
          description: "Provide extra support for Jane Smith in product knowledge",
          priority: "medium",
          targetUsers: ["U0987654321"]
        },
        {
          type: "recognition",
          description: "Acknowledge John Doe's excellent performance",
          priority: "low",
          targetUsers: ["U1234567890"]
        }
      ]
    };
    
    // Test email sending
    console.log("📧 Sending test email report...");
    const emailSuccess = await reportingService.sendEmailReport("abhinav.maharana@razorpay.com", sampleReport);
    
    if (emailSuccess) {
      console.log("✅ Email report sent successfully to abhinav.maharana@razorpay.com");
    } else {
      console.log("❌ Failed to send email report");
    }
    
    console.log("🏁 Email report test completed");
    
  } catch (error) {
    console.error("❌ Error during email report test:", error);
  }
}

// Run the test
testEmailReport();
