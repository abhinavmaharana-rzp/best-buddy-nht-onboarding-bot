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
      assessmentId: "core-payments",
      title: "Core Payments - Assessment",
      description: "Assessment on core payment processing concepts and payment flows.",
      passingScore: 80,
      timeLimit: 45,
      maxAttempts: 3,
      proctoringEnabled: true,
      questions: [
        {
          id: 1,
          question: "What is the primary function of a Payment Gateway?",
          options: [
            "To store customer credit card information",
            "To encrypt and transmit payment data between merchant and acquiring bank",
            "To issue credit cards to customers",
            "To provide customer support for failed transactions"
          ],
          correctAnswer: "To encrypt and transmit payment data between merchant and acquiring bank",
          explanation: "A Payment Gateway securely transmits payment information from the merchant to the acquiring bank for processing."
        },
        {
          id: 2,
          question: "In a typical payment flow, what happens during authorization?",
          options: [
            "Funds are transferred to the merchant",
            "The issuing bank verifies the transaction and reserves funds",
            "The customer receives a refund",
            "The payment gateway is shut down"
          ],
          correctAnswer: "The issuing bank verifies the transaction and reserves funds",
          explanation: "During authorization, the issuing bank checks if funds are available and reserves them for the transaction."
        },
        {
          id: 3,
          question: "What is settlement in payment processing?",
          options: [
            "Cancelling a transaction",
            "The actual transfer of funds from the customer's bank to the merchant's account",
            "Creating a new payment method",
            "Verifying customer identity"
          ],
          correctAnswer: "The actual transfer of funds from the customer's bank to the merchant's account",
          explanation: "Settlement is the process where funds are actually transferred after authorization is complete."
        },
        {
          id: 4,
          question: "What is a chargeback?",
          options: [
            "A bonus payment to the merchant",
            "A dispute where funds are returned to the customer by their bank",
            "A fee charged by the payment gateway",
            "An additional payment from the customer"
          ],
          correctAnswer: "A dispute where funds are returned to the customer by their bank",
          explanation: "A chargeback is a reversal of a payment transaction initiated by the cardholder's bank."
        },
        {
          id: 5,
          question: "What does PCI-DSS stand for?",
          options: [
            "Payment Card Industry Data Security Standard",
            "Personal Credit Information Data Safety System",
            "Public Card Identification Database Security",
            "Protected Customer Information Data Storage"
          ],
          correctAnswer: "Payment Card Industry Data Security Standard",
          explanation: "PCI-DSS is a set of security standards designed to ensure that all companies that process card payments maintain a secure environment."
        },
        {
          id: 6,
          question: "What is tokenization in payment processing?",
          options: [
            "Creating physical tokens for payment",
            "Replacing sensitive card data with a unique identifier",
            "Converting currency to tokens",
            "Encrypting payment emails"
          ],
          correctAnswer: "Replacing sensitive card data with a unique identifier",
          explanation: "Tokenization replaces sensitive payment card information with a unique token that can be used for processing without exposing actual card details."
        },
        {
          id: 7,
          question: "What is the role of an acquiring bank?",
          options: [
            "To provide loans to customers",
            "To process credit card payments on behalf of merchants",
            "To issue credit cards",
            "To set interest rates"
          ],
          correctAnswer: "To process credit card payments on behalf of merchants",
          explanation: "An acquiring bank (or acquirer) is a bank that processes credit and debit card payments on behalf of merchants."
        },
        {
          id: 8,
          question: "What is two-factor authentication (2FA) in payments?",
          options: [
            "Using two different credit cards",
            "An additional layer of security requiring two forms of verification",
            "Paying twice for the same product",
            "Having two bank accounts"
          ],
          correctAnswer: "An additional layer of security requiring two forms of verification",
          explanation: "2FA requires users to provide two different authentication factors to verify their identity before completing a transaction."
        },
        {
          id: 9,
          question: "What is the merchant discount rate (MDR)?",
          options: [
            "A discount offered to customers",
            "The fee charged to merchants for processing card payments",
            "A rate for currency conversion",
            "Interest on merchant loans"
          ],
          correctAnswer: "The fee charged to merchants for processing card payments",
          explanation: "MDR is the fee that a merchant is charged by the acquiring bank for processing card payments."
        },
        {
          id: 10,
          question: "What is a payment aggregator?",
          options: [
            "A company that collects payments from multiple merchants",
            "A service that combines multiple payment methods into one platform",
            "A bank that only works with large corporations",
            "A system that prevents payment fraud"
          ],
          correctAnswer: "A service that combines multiple payment methods into one platform",
          explanation: "A payment aggregator enables merchants to accept various payment methods through a single integration, simplifying payment processing."
        }
      ]
    },
    "Core Payments and Platform": {
      assessmentId: "core-payments-platform",
      title: "Core Payments and Platform - Assessment",
      description: "Assessment on core payments and platform architecture.",
      passingScore: 80,
      timeLimit: 45,
      maxAttempts: 3,
      proctoringEnabled: true,
      questions: [
        {
          id: 1,
          question: "What is a microservices architecture in payment systems?",
          options: [
            "A single large application handling all payment functions",
            "An architectural style where applications are built as a collection of small, independent services",
            "A payment method for small transactions",
            "A mobile payment application"
          ],
          correctAnswer: "An architectural style where applications are built as a collection of small, independent services",
          explanation: "Microservices architecture breaks down applications into smaller, loosely coupled services that can be developed and deployed independently."
        },
        {
          id: 2,
          question: "What is an API in the context of payment platforms?",
          options: [
            "A programming interface that allows different software to communicate",
            "A type of credit card",
            "A payment terminal",
            "A security certificate"
          ],
          correctAnswer: "A programming interface that allows different software to communicate",
          explanation: "API (Application Programming Interface) allows different software systems to interact and exchange data programmatically."
        },
        {
          id: 3,
          question: "What is idempotency in payment processing?",
          options: [
            "Processing payments twice for safety",
            "Ensuring the same request produces the same result even if executed multiple times",
            "Rejecting all duplicate payments",
            "A type of encryption"
          ],
          correctAnswer: "Ensuring the same request produces the same result even if executed multiple times",
          explanation: "Idempotency ensures that duplicate requests don't result in duplicate transactions or unintended side effects."
        },
        {
          id: 4,
          question: "What is webhook in payment integrations?",
          options: [
            "A security tool for blocking payments",
            "An HTTP callback that sends real-time notifications",
            "A type of payment card",
            "A database query method"
          ],
          correctAnswer: "An HTTP callback that sends real-time notifications",
          explanation: "Webhooks are automated messages sent from apps when something happens, providing real-time updates about payment events."
        },
        {
          id: 5,
          question: "What does REST API stand for?",
          options: [
            "Representational State Transfer Application Programming Interface",
            "Reliable Electronic Security Transfer API",
            "Remote Electronic System Transaction API",
            "Responsive State Technology API"
          ],
          correctAnswer: "Representational State Transfer Application Programming Interface",
          explanation: "REST is an architectural style for designing networked applications, commonly used in payment platform integrations."
        }
      ]
    },
    "Merchant and Admin Dashboard": {
      assessmentId: "merchant-admin-dashboard",
      title: "Merchant and Admin Dashboard - Assessment",
      description: "Assessment on merchant and admin dashboard functionality.",
      passingScore: 80,
      timeLimit: 30,
      maxAttempts: 3,
      proctoringEnabled: true,
      questions: [
        {
          id: 1,
          question: "What is the primary purpose of a merchant dashboard?",
          options: [
            "To allow customers to make payments",
            "To provide merchants with insights and control over their transactions",
            "To issue refunds to all customers",
            "To create new payment gateways"
          ],
          correctAnswer: "To provide merchants with insights and control over their transactions",
          explanation: "A merchant dashboard gives merchants visibility into transactions, settlements, analytics, and operational controls."
        },
        {
          id: 2,
          question: "What information should be available in transaction reports?",
          options: [
            "Only successful transactions",
            "Customer passwords and PINs",
            "Transaction status, amounts, dates, and payment methods",
            "Bank employee details"
          ],
          correctAnswer: "Transaction status, amounts, dates, and payment methods",
          explanation: "Transaction reports should provide comprehensive details about payments while maintaining security and privacy."
        },
        {
          id: 3,
          question: "What is the purpose of settlement reports?",
          options: [
            "To show when funds will be transferred to the merchant's account",
            "To display customer complaints",
            "To create new merchant accounts",
            "To cancel all pending transactions"
          ],
          correctAnswer: "To show when funds will be transferred to the merchant's account",
          explanation: "Settlement reports track when and how much money will be deposited into the merchant's bank account."
        },
        {
          id: 4,
          question: "What is refund reconciliation?",
          options: [
            "Refusing to process any refunds",
            "Matching refund transactions with original payments",
            "Charging customers twice",
            "Deleting refund records"
          ],
          correctAnswer: "Matching refund transactions with original payments",
          explanation: "Refund reconciliation ensures that refunds are properly tracked and matched to their corresponding original transactions."
        },
        {
          id: 5,
          question: "What role does an admin dashboard serve?",
          options: [
            "To process customer payments directly",
            "To provide administrative oversight and management capabilities",
            "To replace all merchant dashboards",
            "To store credit card numbers"
          ],
          correctAnswer: "To provide administrative oversight and management capabilities",
          explanation: "Admin dashboards provide system-wide management, monitoring, and configuration capabilities for platform administrators."
        }
      ]
    },
    "Recurring": {
      assessmentId: "recurring-payments",
      title: "Recurring Payments - Assessment",
      description: "Assessment on recurring payment concepts and implementation.",
      passingScore: 80,
      timeLimit: 30,
      maxAttempts: 3,
      proctoringEnabled: true,
      questions: [
        {
          id: 1,
          question: "What are recurring payments?",
          options: [
            "One-time payments",
            "Automatic payments made at regular intervals",
            "Cash payments only",
            "Payments that always fail"
          ],
          correctAnswer: "Automatic payments made at regular intervals",
          explanation: "Recurring payments are automated transactions that occur on a regular schedule, commonly used for subscriptions."
        },
        {
          id: 2,
          question: "What is a subscription model?",
          options: [
            "A one-time purchase",
            "A business model where customers pay regularly for access to a product or service",
            "A type of credit card",
            "A payment terminal"
          ],
          correctAnswer: "A business model where customers pay regularly for access to a product or service",
          explanation: "Subscription models involve recurring payments in exchange for ongoing access to products or services."
        },
        {
          id: 3,
          question: "What is dunning management?",
          options: [
            "Creating new subscriptions",
            "The process of communicating with customers about failed payments",
            "Cancelling all subscriptions",
            "Setting up payment gateways"
          ],
          correctAnswer: "The process of communicating with customers about failed payments",
          explanation: "Dunning management involves automated processes to recover failed recurring payments through communication and retry logic."
        },
        {
          id: 4,
          question: "What is a billing cycle?",
          options: [
            "The time between recurring payments",
            "A type of payment card",
            "A one-time transaction",
            "A payment terminal"
          ],
          correctAnswer: "The time between recurring payments",
          explanation: "A billing cycle defines the regular interval at which recurring payments are processed (e.g., monthly, annually)."
        },
        {
          id: 5,
          question: "What is proration in subscriptions?",
          options: [
            "Cancelling a subscription immediately",
            "Adjusting charges based on partial usage periods",
            "Doubling the subscription fee",
            "Blocking all payments"
          ],
          correctAnswer: "Adjusting charges based on partial usage periods",
          explanation: "Proration calculates partial charges when subscriptions are upgraded, downgraded, or started mid-cycle."
        }
      ]
    },
    "Products 2.0": {
      assessmentId: "products-2-0",
      title: "Products 2.0 - Assessment",
      description: "Assessment on Products 2.0 features and capabilities.",
      passingScore: 80,
      timeLimit: 40,
      maxAttempts: 3,
      proctoringEnabled: true,
      questions: [
        {
          id: 1,
          question: "What is the main advantage of a unified payment platform?",
          options: [
            "It only processes credit cards",
            "It integrates multiple payment methods and services into one system",
            "It requires separate integrations for each feature",
            "It only works in one country"
          ],
          correctAnswer: "It integrates multiple payment methods and services into one system",
          explanation: "A unified platform provides a single integration point for multiple payment methods and related services."
        },
        {
          id: 2,
          question: "What are smart collect features?",
          options: [
            "Manual payment collection only",
            "Automated payment collection and reconciliation features",
            "A type of credit card",
            "A physical collection box"
          ],
          correctAnswer: "Automated payment collection and reconciliation features",
          explanation: "Smart collect features automate payment collection, identification, and reconciliation processes."
        },
        {
          id: 3,
          question: "What is a payment link?",
          options: [
            "A chain connecting payment terminals",
            "A shareable URL that allows customers to make payments",
            "A type of credit card",
            "A physical wire between banks"
          ],
          correctAnswer: "A shareable URL that allows customers to make payments",
          explanation: "Payment links are URLs that merchants can share with customers to collect payments without a website checkout."
        },
        {
          id: 4,
          question: "What is the purpose of virtual accounts?",
          options: [
            "To create fake bank accounts",
            "To provide unique account numbers for automatic payment reconciliation",
            "To block all payments",
            "To store credit card data"
          ],
          correctAnswer: "To provide unique account numbers for automatic payment reconciliation",
          explanation: "Virtual accounts are unique bank account numbers assigned to customers for easier payment tracking and reconciliation."
        },
        {
          id: 5,
          question: "What is an invoice in digital payments?",
          options: [
            "A bill sent to customers requesting payment",
            "A refund receipt",
            "A bank statement",
            "A credit card"
          ],
          correctAnswer: "A bill sent to customers requesting payment",
          explanation: "Digital invoices are electronic bills that can be sent to customers with payment collection capabilities."
        }
      ]
    },
    "Cross Border Payments": {
      assessmentId: "cross-border-payments",
      title: "Cross Border Payments - Assessment",
      description: "Assessment on cross-border payment processing and regulations.",
      passingScore: 80,
      timeLimit: 35,
      maxAttempts: 3,
      proctoringEnabled: true,
      questions: [
        {
          id: 1,
          question: "What are cross-border payments?",
          options: [
            "Payments within the same country",
            "Transactions between parties in different countries",
            "Cash-only transactions",
            "In-store purchases only"
          ],
          correctAnswer: "Transactions between parties in different countries",
          explanation: "Cross-border payments involve transferring money between individuals or businesses in different countries."
        },
        {
          id: 2,
          question: "What is foreign exchange (FX) in cross-border payments?",
          options: [
            "Exchanging business cards",
            "Converting one currency to another",
            "Trading stocks internationally",
            "Shipping products overseas"
          ],
          correctAnswer: "Converting one currency to another",
          explanation: "Foreign exchange involves converting currencies to facilitate international payments."
        },
        {
          id: 3,
          question: "What is SWIFT?",
          options: [
            "A fast payment method",
            "A global network for international financial messaging",
            "A type of credit card",
            "A shipping service"
          ],
          correctAnswer: "A global network for international financial messaging",
          explanation: "SWIFT (Society for Worldwide Interbank Financial Telecommunication) is a network used by banks for secure international money transfers."
        },
        {
          id: 4,
          question: "What is a correspondent bank?",
          options: [
            "A bank that writes letters",
            "An intermediary bank that facilitates international transactions",
            "A customer service bank",
            "A bank that only operates online"
          ],
          correctAnswer: "An intermediary bank that facilitates international transactions",
          explanation: "Correspondent banks act as intermediaries to facilitate cross-border transactions between banks that don't have direct relationships."
        },
        {
          id: 5,
          question: "What is KYC in international payments?",
          options: [
            "Know Your Customer - identity verification process",
            "Keep Your Card - card retention policy",
            "Key Your Code - password system",
            "Kindly Your Confirmation - approval request"
          ],
          correctAnswer: "Know Your Customer - identity verification process",
          explanation: "KYC (Know Your Customer) is a process used to verify customer identities to prevent fraud and comply with regulations."
        }
      ]
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
