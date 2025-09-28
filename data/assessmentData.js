// Assessment configuration for proctored assessments
module.exports = {
  // Map of task titles to their assessment configurations
  assessments: {
    "Fintech 101": {
      googleFormUrl: "https://forms.gle/your-fintech-101-form-url",
      passingScore: 80,
      timeLimit: 30, // minutes
      maxAttempts: 3,
      proctoringEnabled: true,
      description: "Assessment on fintech fundamentals and concepts",
    },
    "Core Payments": {
      googleFormUrl: "https://forms.gle/your-core-payments-form-url",
      passingScore: 80,
      timeLimit: 45,
      maxAttempts: 3,
      proctoringEnabled: true,
      description: "Assessment on core payment processing concepts",
    },
    "Core Payments and Platform": {
      googleFormUrl: "https://forms.gle/your-core-payments-platform-form-url",
      passingScore: 80,
      timeLimit: 45,
      maxAttempts: 3,
      proctoringEnabled: true,
      description: "Assessment on core payments and platform architecture",
    },
    "Merchant and Admin Dashboard": {
      googleFormUrl: "https://forms.gle/your-merchant-admin-dashboard-form-url",
      passingScore: 80,
      timeLimit: 30,
      maxAttempts: 3,
      proctoringEnabled: true,
      description: "Assessment on merchant and admin dashboard functionality",
    },
    "Recurring": {
      googleFormUrl: "https://forms.gle/your-recurring-payments-form-url",
      passingScore: 80,
      timeLimit: 30,
      maxAttempts: 3,
      proctoringEnabled: true,
      description: "Assessment on recurring payment concepts and implementation",
    },
    "Products 2.0": {
      googleFormUrl: "https://forms.gle/your-products-2-0-form-url",
      passingScore: 80,
      timeLimit: 40,
      maxAttempts: 3,
      proctoringEnabled: true,
      description: "Assessment on Products 2.0 features and capabilities",
    },
    "Cross Border Payments": {
      googleFormUrl: "https://forms.gle/your-cross-border-payments-form-url",
      passingScore: 80,
      timeLimit: 35,
      maxAttempts: 3,
      proctoringEnabled: true,
      description: "Assessment on cross-border payment processing and regulations",
    },
  },

  // Proctoring configuration
  proctoring: {
    screenRecording: {
      enabled: true,
      quality: "medium", // low, medium, high
      frameRate: 1, // frames per second
    },
    violations: {
      tabSwitch: {
        enabled: true,
        maxAllowed: 3,
        severity: "medium",
      },
      windowFocusLoss: {
        enabled: true,
        maxAllowed: 5,
        severity: "low",
      },
      copyPaste: {
        enabled: true,
        maxAllowed: 0,
        severity: "high",
      },
      rightClick: {
        enabled: true,
        maxAllowed: 0,
        severity: "high",
      },
      keyboardShortcuts: {
        enabled: true,
        allowed: ["F5", "Ctrl+R"], // Refresh allowed
        severity: "medium",
      },
      multipleWindows: {
        enabled: true,
        maxAllowed: 0,
        severity: "high",
      },
    },
    warnings: {
      firstViolation: "This is your first warning. Please focus on the assessment.",
      secondViolation: "This is your second warning. Further violations may result in assessment termination.",
      finalWarning: "This is your final warning. Any further violations will result in immediate assessment termination.",
    },
  },

  // Assessment flow messages
  messages: {
    start: {
      title: "Proctored Assessment Starting",
      content: "Your proctored assessment is about to begin. Please ensure you have a stable internet connection and are in a quiet environment. The assessment will be monitored for academic integrity.",
    },
    instructions: [
      "Do not switch tabs or open new windows during the assessment",
      "Do not use copy-paste functionality",
      "Do not right-click on the page",
      "Ensure your camera and microphone are working properly",
      "You will be monitored throughout the assessment",
      "Any violations will result in warnings or termination",
    ],
    success: {
      title: "Assessment Completed Successfully",
      content: "Congratulations! You have successfully completed the assessment with a passing score. Your results have been submitted for review.",
    },
    failure: {
      title: "Assessment Not Passed",
      content: "Unfortunately, you did not achieve the required passing score. Please prepare well and try again. You can retake this assessment after reviewing the material.",
    },
    violation: {
      title: "Assessment Violation Detected",
      content: "A violation has been detected during your assessment. Please review the rules and continue with the assessment.",
    },
    terminated: {
      title: "Assessment Terminated",
      content: "Your assessment has been terminated due to multiple violations. Please contact your administrator for further assistance.",
    },
  },
};
