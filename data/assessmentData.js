// Assessment configuration for proctored assessments
module.exports = {
  // Map of task titles to their assessment configurations
  assessments: {
    "Fintech 101": {
      assessmentId: "fintech-101",
      title: "Fintech 101 - Assessment",
      description: "Assessment on fintech fundamentals and concepts related to the Indian payment ecosystem.",
      passingScore: 80,
      timeLimit: 30, // minutes
      maxAttempts: 3,
      proctoringEnabled: false,
      questions: [
        {
          id: 1,
          question: "Which one of these are not responsible for shaping our Payment Ecosystem *",
          options: [
            "NPCI",
            "RBI", 
            "Finance Ministry",
            "Card Schemes"
          ],
          correctAnswer: "Finance Ministry",
          explanation: "The Finance Ministry sets fiscal policy but doesn't directly shape the payment ecosystem's technical and regulatory framework like the RBI (regulator), NPCI (infrastructure), and Card Schemes (networks)."
        },
        {
          id: 2,
          question: "Which entity helps to route UPI Payments *",
          options: [
            "NPCI",
            "RBI",
            "Card schemes", 
            "Banks"
          ],
          correctAnswer: "NPCI",
          explanation: "The National Payments Corporation of India (NPCI) is the umbrella organization for operating retail payments and settlement systems in India, including UPI."
        },
        {
          id: 3,
          question: "Which one of these is not a card Network *",
          options: [
            "VISA",
            "BHIM",
            "Maestro",
            "Rupay"
          ],
          correctAnswer: "BHIM",
          explanation: "VISA, Maestro, and Rupay are card networks that facilitate card-based transactions. BHIM is a mobile payment app based on the UPI platform."
        },
        {
          id: 4,
          question: "How does RBI impact Razorpay *",
          options: [
            "To regulate the issue of bank notes and keeping of reserves to secure the monetary stability in India.",
            "To operate the currency and credit system stability of the country.",
            "By releasing new guidelines for Industries in online payment world",
            "To maintain price stability while keeping in mind the objective of growth."
          ],
          correctAnswer: "By releasing new guidelines for Industries in online payment world",
          explanation: "The Reserve Bank of India (RBI) acts as the primary regulator for payment systems in India, issuing guidelines and licenses that companies like Razorpay must adhere to."
        },
        {
          id: 5,
          question: "Razorpay is only a Payment Gateway *",
          options: [
            "True",
            "False"
          ],
          correctAnswer: "False",
          explanation: "Razorpay started as a payment gateway but has expanded into a full-stack financial services company, offering products like RazorpayX for business banking and Capital for lending."
        },
        {
          id: 6,
          question: "QR codes comes under which payment methods *",
          options: [
            "Netbanking",
            "Wallets",
            "UPI",
            "B&C only"
          ],
          correctAnswer: "UPI",
          explanation: "While wallets can use QR codes, the interoperable QR code system widely used in India for payments is primarily powered by the Unified Payments Interface (UPI)."
        },
        {
          id: 7,
          question: "What product has not been developed by NPCI? *",
          options: [
            "BBPS",
            "BHIM",
            "Wallet",
            "IMPS"
          ],
          correctAnswer: "Wallet",
          explanation: "NPCI has developed key payment infrastructures like BBPS, IMPS, and the UPI-based app BHIM. It does not operate its own consumer-facing digital wallet."
        },
        {
          id: 8,
          question: "3DS flow has been introduced : *",
          options: [
            "To provide offers on Cards",
            "To prevent frauds on a Card transation",
            "To give Merchants the card details",
            "To debit the customer bank account"
          ],
          correctAnswer: "To prevent frauds on a Card transation",
          explanation: "3D Secure (3DS) is an authentication protocol that provides an additional layer of security for online card transactions to reduce the risk of fraud."
        },
        {
          id: 9,
          question: "Which of the following is not a PSP app *",
          options: [
            "Amazon Pay",
            "PhonePE",
            "Mobikwik",
            "Juspay"
          ],
          correctAnswer: "Juspay",
          explanation: "Amazon Pay, PhonePE, and Mobikwik are consumer-facing Payment Service Provider (PSP) apps. Juspay is a B2B payment technology provider that offers infrastructure to other businesses."
        },
        {
          id: 10,
          question: "Razorpay debits the funds from the end customer bank account in a transaction",
          options: [
            "True",
            "False"
          ],
          correctAnswer: "False",
          explanation: "The customer's issuing bank is responsible for debiting the funds. Razorpay, as a payment aggregator, facilitates the transaction authorization and settlement process."
        },
        {
          id: 11,
          question: "Which Razorpay entity is responsible for Merchant's payouts *",
          options: [
            "Razorpay X",
            "Capital",
            "Razorpay POS",
            "Payments"
          ],
          correctAnswer: "Razorpay X",
          explanation: "RazorpayX is Razorpay's neobanking platform designed for businesses to manage their finances, including automating and scheduling payouts to vendors and employees."
        },
        {
          id: 12,
          question: "Which checkout option is used when Razorpay handles only the backend? *",
          options: [
            "Standard Checkout",
            "Custom Checkout",
            "None of the above"
          ],
          correctAnswer: "Custom Checkout",
          explanation: "A Custom Checkout involves using Razorpay's APIs to process payments on the backend while the merchant builds and controls the entire frontend user interface."
        },
        {
          id: 13,
          question: "Which governing body build Gateways *",
          options: [
            "NPCI",
            "Networks",
            "Banks",
            "Option B & Option C"
          ],
          correctAnswer: "Option B & Option C",
          explanation: "Payment Gateways are typically built and operated by banks (acquiring banks) and card networks (like Visa, Mastercard) to process online transactions securely."
        }
      ]
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
