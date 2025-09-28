# Proctored Assessment System

This document describes the proctored assessment feature added to the Razorpay Onboarding Slack Bot.

## Overview

The proctored assessment system provides a secure, monitored environment for completing assessments during the onboarding process. When users click "Mark Complete" on specific tasks, they are redirected to a proctored assessment interface that:

- Records their screen during the assessment
- Monitors for violations (tab switching, copy-paste, etc.)
- Integrates with Google Forms for the actual assessment
- Automatically scores and approves/rejects based on performance
- Provides detailed feedback and progress tracking

## Features

### 🎯 Proctored Assessments
- **Screen Recording**: Continuous screen recording during assessment
- **Violation Detection**: Real-time monitoring for:
  - Tab switching
  - Window focus loss
  - Copy-paste operations
  - Right-click attempts
  - Keyboard shortcuts
  - Multiple window usage
- **Time Management**: Configurable time limits per assessment
- **Attempt Tracking**: Maximum attempt limits with penalties

### 📊 Scoring System
- **80% Passing Threshold**: All assessments require 80% to pass
- **Intelligent Scoring**: Considers:
  - Time spent on assessment
  - Number of violations
  - Attempt count
  - Assessment difficulty
- **Detailed Feedback**: Personalized feedback based on performance

### 🔒 Security Features
- **Proctoring Environment**: Locked-down browser environment
- **Violation Warnings**: Progressive warnings before termination
- **Session Management**: Secure session tracking and validation
- **Data Integrity**: Encrypted storage of recordings and session data

## Supported Assessment Topics

The following topics require proctored assessments:

1. **Fintech 101** (30 minutes, 20 questions)
2. **Core Payments** (45 minutes, 25 questions)
3. **Core Payments and Platform** (45 minutes, 30 questions)
4. **Merchant and Admin Dashboard** (30 minutes, 20 questions)
5. **Recurring** (30 minutes, 15 questions)
6. **Products 2.0** (40 minutes, 25 questions)
7. **Cross Border Payments** (35 minutes, 20 questions)

## Technical Architecture

### Database Models

#### Assessment Model
```javascript
{
  userId: String,
  taskTitle: String,
  weekIndex: Number,
  dayIndex: Number,
  taskIndex: Number,
  googleFormUrl: String,
  status: String, // pending, in_progress, completed, failed
  score: Number,
  passingScore: Number,
  passed: Boolean,
  startedAt: Date,
  completedAt: Date,
  proctoringData: {
    sessionId: String,
    recordingUrl: String,
    violations: Array
  },
  attemptCount: Number,
  maxAttempts: Number,
  feedback: String
}
```

#### ProctoringSession Model
```javascript
{
  sessionId: String,
  userId: String,
  assessmentId: ObjectId,
  status: String, // active, completed, terminated, failed
  startTime: Date,
  endTime: Date,
  duration: Number,
  screenRecording: {
    enabled: Boolean,
    fileUrl: String,
    startTime: Date,
    endTime: Date
  },
  violations: Array,
  environment: Object,
  metadata: Object
}
```

### API Endpoints

#### Assessment Management
- `POST /api/assessment/start` - Start a new proctored assessment
- `GET /api/assessment/config/:assessmentId` - Get assessment configuration
- `POST /api/assessment/complete` - Complete assessment with scoring
- `POST /api/assessment/event` - Handle assessment events
- `POST /api/assessment/violation` - Report violations
- `POST /api/assessment/upload-recording` - Upload screen recording

#### Results and Monitoring
- `GET /api/assessment/results/:userId` - Get user's assessment results
- `GET /api/assessment/sessions/:userId` - Get proctoring sessions
- `POST /api/assessment/webhook/completion` - Completion notifications

### Frontend Components

#### Assessment Interface (`/assessment.html`)
- Pre-assessment instructions and rules
- Proctored assessment environment
- Real-time violation monitoring
- Timer and progress tracking
- Post-assessment results display

#### Proctoring Client (`/js/proctoring.js`)
- Screen recording setup
- Violation detection algorithms
- Real-time monitoring and reporting
- User interface for warnings and notifications

## User Flow

### 1. Task Completion Request
1. User clicks "Mark Complete" on a task in Slack
2. System checks if task requires proctored assessment
3. If yes, assessment flow begins; if no, standard approval flow

### 2. Assessment Initialization
1. System creates assessment record
2. Proctoring session starts
3. User receives Slack message with assessment link
4. User clicks link to open assessment interface

### 3. Proctored Assessment
1. User sees pre-assessment instructions
2. Screen recording begins automatically
3. User completes Google Forms assessment
4. System monitors for violations in real-time
5. Timer tracks remaining time

### 4. Assessment Completion
1. System calculates score based on performance
2. Results are stored in database
3. User receives notification in Slack
4. Task status is updated automatically
5. Screen recording is saved securely

## Configuration

### Environment Variables
```bash
BASE_URL=http://localhost:3000  # Base URL for assessment links
MONGODB_URI=mongodb://localhost:27017/onboarding
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
```

### Assessment Configuration
Update `data/assessmentData.js` to configure:
- Google Forms URLs
- Time limits
- Passing scores
- Max attempts
- Proctoring settings

## Security Considerations

### Data Protection
- Screen recordings are encrypted and stored securely
- Session data is anonymized where possible
- Violation data is stored for audit purposes only

### Privacy
- Users are clearly informed about monitoring
- Recording consent is obtained before assessment
- Data retention policies are enforced

### Access Control
- Only authorized administrators can view recordings
- Assessment results are user-specific
- API endpoints require proper authentication

## Monitoring and Analytics

### Admin Dashboard
- Real-time assessment monitoring
- Violation tracking and analysis
- User progress and completion rates
- Performance metrics and insights

### Reporting
- Detailed violation reports
- Assessment completion statistics
- User performance analytics
- System health monitoring

## Testing

Run the test suite to verify functionality:

```bash
node test-assessment.js
```

This will test:
- Scoring system accuracy
- Database model validation
- Assessment configuration
- API endpoint functionality

## Deployment

### Prerequisites
1. Update Google Forms URLs in configuration
2. Set up proper environment variables
3. Configure file storage for recordings
4. Set up monitoring and logging

### Production Checklist
- [ ] Google Forms URLs configured
- [ ] Environment variables set
- [ ] File storage configured
- [ ] SSL certificates installed
- [ ] Monitoring setup
- [ ] Backup procedures in place

## Troubleshooting

### Common Issues

#### Screen Recording Fails
- Check browser permissions
- Verify HTTPS connection
- Ensure proper media device access

#### Violation Detection Issues
- Check JavaScript console for errors
- Verify event listeners are properly attached
- Test in different browsers

#### Scoring Problems
- Verify Google Forms integration
- Check assessment configuration
- Review scoring algorithm parameters

### Support
For technical support or questions about the proctored assessment system, contact the development team.

## Future Enhancements

### Planned Features
- AI-powered violation detection
- Advanced analytics dashboard
- Mobile device support
- Integration with additional assessment platforms
- Real-time proctoring alerts
- Advanced reporting and insights

### Integration Opportunities
- Learning Management Systems (LMS)
- HR Information Systems (HRIS)
- Advanced analytics platforms
- Third-party proctoring services

---

*This document is maintained by the Razorpay Onboarding Team. Last updated: [Current Date]*
