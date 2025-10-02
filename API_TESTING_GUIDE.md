# API Testing Guide - Razorpay Onboarding Bot

This guide provides comprehensive instructions for testing all API endpoints using Postman or any other API testing tool.

## 🚀 Quick Start

1. **Import the Postman Collection**: Import `postman_collection.json` into Postman
2. **Set Environment Variables**: Update the variables in the collection
3. **Start the Application**: Run `node app.js` 
4. **Test Endpoints**: Use the organized folder structure in Postman

## 📋 Environment Variables

Update these variables in Postman:

| Variable | Value | Description |
|----------|-------|-------------|
| `base_url` | `http://localhost:3000` | Base URL of the application |
| `auth_token` | `your_jwt_token_here` | JWT token from login |
| `user_id` | `U1234567890` | Slack user ID for testing |
| `assessment_id` | `assessment_id_here` | Assessment ID for testing |

## 🔐 Authentication

### 1. Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin"
  }
}
```

### 2. Verify Token
```http
GET /auth/verify
Authorization: Bearer {token}
```

## 📊 Assessment APIs

### 1. Get Assessment Configuration
```http
GET /api/assessment/config/{assessmentId}
```

**Example:**
```http
GET /api/assessment/config/64f1a2b3c4d5e6f7g8h9i0j1
```

### 2. Start Assessment
```http
POST /api/assessment/start
Content-Type: application/json

{
  "userId": "U1234567890",
  "taskTitle": "Fintech 101",
  "weekIndex": 0,
  "dayIndex": 1,
  "taskIndex": 0,
  "googleFormUrl": "https://forms.gle/test123"
}
```

### 3. Complete Assessment
```http
POST /api/assessment/complete
Content-Type: application/json

{
  "assessmentId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "userId": "U1234567890",
  "formUrl": "https://forms.gle/test123",
  "timeSpent": 1200,
  "violations": 2,
  "attemptCount": 1
}
```

### 4. Get Assessment Results
```http
GET /api/assessment/results/{userId}
Authorization: Bearer {token}
```

### 5. Get Proctoring Sessions
```http
GET /api/proctoring/sessions/{userId}
Authorization: Bearer {token}
```

### 6. Upload Screen Recording
```http
POST /api/proctoring/upload
Content-Type: multipart/form-data

Form Data:
- recording: [file] (video file)
- sessionId: "session_123"
```

## 📈 Analytics APIs

### 1. Get Overview Analytics
```http
GET /api/analytics/overview
Authorization: Bearer {token}
```

**Response:**
```json
{
  "totalUsers": 150,
  "activeUsers": 120,
  "completedOnboardings": 45,
  "averageProgress": 68.5,
  "assessmentsPassed": 89,
  "assessmentsFailed": 12
}
```

### 2. Get User Progress Analytics
```http
GET /api/analytics/progress
Authorization: Bearer {token}
```

### 3. Get Assessment Analytics
```http
GET /api/analytics/assessments
Authorization: Bearer {token}
```

### 4. Get Gamification Analytics
```http
GET /api/analytics/gamification
Authorization: Bearer {token}
```

## 🎛️ Dashboard APIs

### 1. Get Dashboard Overview
```http
GET /dashboard/overview
Authorization: Bearer {token}
```

### 2. Get User Progress
```http
GET /dashboard/users
Authorization: Bearer {token}
```

### 3. Get Approval Requests
```http
GET /dashboard/approvals
Authorization: Bearer {token}
```

### 4. Trigger Onboarding
```http
POST /dashboard/trigger-onboarding
Content-Type: application/json
Authorization: Bearer {token}

{
  "userId": "U1234567890",
  "userName": "John Doe",
  "email": "john.doe@example.com",
  "function": "Engineering",
  "subFunction": "Backend"
}
```

## 👥 User Lookup APIs

### 1. Lookup User by Email
```http
GET /user-lookup/email?email=john.doe@example.com
```

### 2. Update Task Approval
```http
POST /user-lookup/update-approval
Content-Type: application/json

{
  "approvalId": "approval_123",
  "status": "approved",
  "reviewedBy": "manager_123"
}
```

## 🔗 Webhook Endpoints

### 1. Assessment Completion Webhook
```http
POST /api/assessment/webhook/completion
Content-Type: application/json

{
  "assessmentId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "userId": "U1234567890",
  "score": 85,
  "passed": true,
  "completedAt": "2024-01-15T10:30:00Z"
}
```

## 🏥 Health Check

### 1. API Health Check
```http
GET /
```

## 📝 Testing Workflow

### Complete Assessment Flow:
1. **Login** → Get authentication token
2. **Start Assessment** → Create new assessment
3. **Upload Recording** → Upload screen recording (optional)
4. **Complete Assessment** → Submit assessment results
5. **Get Results** → Retrieve assessment results
6. **Check Analytics** → View performance metrics

### Dashboard Management Flow:
1. **Login** → Get authentication token
2. **Trigger Onboarding** → Start new user onboarding
3. **Get Overview** → View dashboard statistics
4. **Get User Progress** → Check individual progress
5. **Get Approvals** → Review pending approvals
6. **Update Approval** → Approve/reject tasks

## 🛠️ Common Headers

### Authentication Required:
```http
Authorization: Bearer {your_jwt_token}
```

### Content Type for JSON:
```http
Content-Type: application/json
```

### Content Type for File Upload:
```http
Content-Type: multipart/form-data
```

## 📊 Sample Data

### User Data:
```json
{
  "userId": "U1234567890",
  "userName": "John Doe",
  "email": "john.doe@example.com",
  "function": "Engineering",
  "subFunction": "Backend"
}
```

### Assessment Data:
```json
{
  "taskTitle": "Fintech 101",
  "weekIndex": 0,
  "dayIndex": 1,
  "taskIndex": 0,
  "googleFormUrl": "https://forms.gle/test123"
}
```

## 🔍 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 500 | Internal Server Error |

## 📱 Web Interface URLs

- **Login Page**: http://localhost:3000/
- **Admin Dashboard**: http://localhost:3000/dashboard
- **Analytics Dashboard**: http://localhost:3000/analytics
- **API Documentation**: http://localhost:3000/api-docs

## 🚨 Important Notes

1. **Authentication**: Most endpoints require a valid JWT token
2. **File Uploads**: Use multipart/form-data for file uploads
3. **User IDs**: Use Slack user ID format (e.g., U1234567890)
4. **Assessment IDs**: Use MongoDB ObjectId format
5. **Rate Limiting**: Be mindful of API rate limits in production

## 🧪 Testing Tips

1. **Start with Authentication**: Always login first to get a valid token
2. **Use Real Data**: Use realistic user data for better testing
3. **Test Error Cases**: Try invalid data to test error handling
4. **Check Responses**: Verify response structure matches documentation
5. **Test File Uploads**: Use actual video files for upload testing

---

**Happy Testing! 🎉**
