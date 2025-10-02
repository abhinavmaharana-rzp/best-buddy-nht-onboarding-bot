# Assessment 404 Error Debug Guide

## Problem
Getting 404 error when accessing `/api/assessment/config/68de17f634a10bdcfe6dd985`

## Error Analysis

### What's Happening
1. Frontend loads `assessment.html?assessmentId=68de17f634a10bdcfe6dd985&sessionId=session_1759408892922_b87mbrr8r`
2. JavaScript tries to load assessment config via `/api/assessment/config/68de17f634a10bdcfe6dd985`
3. Backend can't find assessment with that ID in database
4. Returns 404 error
5. Frontend shows "Failed to load assessment configuration" error

### Root Causes
1. **Assessment never created** - The assessment start process failed
2. **Assessment deleted** - Assessment was removed from database
3. **Database connection issue** - Can't connect to MongoDB
4. **Invalid assessment ID** - ID format is wrong or corrupted
5. **Assessment expired** - Assessment was cleaned up due to timeout

## Solutions

### Solution 1: Check Database Connection
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand('ping')"

# Or check connection from Node.js
node -e "const mongoose = require('mongoose'); mongoose.connect('mongodb://localhost:27017/nht-slack-bot').then(() => console.log('Connected')).catch(err => console.error('Error:', err.message))"
```

### Solution 2: Verify Assessment Exists
```bash
# Run the test script
node test-assessment-creation.js
```

### Solution 3: Check Application Logs
Look for these log messages:
- `🎯 Starting assessment directly for user...`
- `✅ Assessment created/updated:`
- `✅ Proctoring session created:`

### Solution 4: Create Assessment Manually
If the assessment doesn't exist, create it:

```javascript
// POST /api/assessment/start
{
  "userId": "your_user_id",
  "taskTitle": "Fintech 101",
  "weekIndex": 0,
  "dayIndex": 0,
  "taskIndex": 0
}
```

### Solution 5: Fix the Frontend Error Handling
The frontend should handle 404 errors gracefully:

```javascript
async loadAssessmentConfig() {
  try {
    const response = await fetch(`/api/assessment/config/${this.assessmentId}`);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Assessment not found. Please start a new assessment.');
      }
      throw new Error('Failed to load assessment configuration');
    }
    // ... rest of the code
  } catch (error) {
    console.error('Error loading assessment config:', error);
    this.showError('Assessment not found. Please contact support or start a new assessment.');
  }
}
```

## Debugging Steps

### Step 1: Check Database
```bash
# Connect to MongoDB
mongosh nht-slack-bot

# Check if assessment exists
db.assessments.findOne({_id: ObjectId("68de17f634a10bdcfe6dd985")})

# Check all assessments
db.assessments.find().limit(5)
```

### Step 2: Check Application Status
```bash
# Check if app is running
curl http://localhost:3000/api/assessment/health

# Check if database is connected
curl http://localhost:3000/api/assessment/admin/assessments
```

### Step 3: Test Assessment Creation
```bash
# Start the application
npm start

# In another terminal, test assessment creation
curl -X POST http://localhost:3000/api/assessment/start \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_123",
    "taskTitle": "Fintech 101",
    "weekIndex": 0,
    "dayIndex": 0,
    "taskIndex": 0
  }'
```

### Step 4: Check Environment Variables
Make sure these are set:
- `MONGODB_URI` - MongoDB connection string
- `BASE_URL` - Application base URL
- `NODE_ENV` - Environment (development/production)

## Prevention

### 1. Add Better Error Handling
```javascript
// In routes/assessment.js
router.get("/config/:assessmentId", async (req, res) => {
  try {
    const { assessmentId } = req.params;
    
    // Validate assessment ID format
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({ 
        error: "Invalid assessment ID format",
        code: "INVALID_ASSESSMENT_ID"
      });
    }
    
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ 
        error: "Assessment not found",
        code: "ASSESSMENT_NOT_FOUND",
        assessmentId: assessmentId
      });
    }
    
    // ... rest of the code
  } catch (error) {
    console.error("Error getting assessment config:", error);
    res.status(500).json({ 
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
});
```

### 2. Add Frontend Validation
```javascript
// In assessment.html
async loadAssessmentConfig() {
  try {
    // Validate assessment ID format
    if (!this.isValidObjectId(this.assessmentId)) {
      throw new Error('Invalid assessment ID format');
    }
    
    const response = await fetch(`/api/assessment/config/${this.assessmentId}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to load assessment configuration');
    }
    
    // ... rest of the code
  } catch (error) {
    console.error('Error loading assessment config:', error);
    this.showError(`Assessment Error: ${error.message}`);
  }
}

isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}
```

### 3. Add Health Checks
```javascript
// Add to app.js
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});
```

## Common Issues & Fixes

### Issue 1: Database Not Connected
**Error**: `connect ECONNREFUSED`
**Fix**: Start MongoDB service or check connection string

### Issue 2: Assessment ID Not Found
**Error**: `Assessment not found`
**Fix**: Create assessment first via `/api/assessment/start`

### Issue 3: Invalid Assessment ID Format
**Error**: `Invalid assessment ID format`
**Fix**: Ensure ID is a valid MongoDB ObjectId (24 hex characters)

### Issue 4: Assessment Configuration Missing
**Error**: `Assessment configuration not found`
**Fix**: Check if task title exists in `assessmentData.js`

### Issue 5: Session Expired
**Error**: Assessment exists but session is invalid
**Fix**: Create new assessment or extend session timeout

## Testing

### Test Assessment Creation
```bash
node test-assessment-creation.js
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Start assessment
curl -X POST http://localhost:3000/api/assessment/start \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","taskTitle":"Fintech 101","weekIndex":0,"dayIndex":0,"taskIndex":0}'

# Get assessment config
curl http://localhost:3000/api/assessment/config/{assessment_id}
```

## Monitoring

### Add Logging
```javascript
// Add to assessment routes
console.log(`Assessment config request: ${assessmentId}`);
console.log(`Assessment found: ${assessment ? 'yes' : 'no'}`);
console.log(`Config found: ${config ? 'yes' : 'no'}`);
```

### Add Metrics
```javascript
// Track assessment creation success/failure
const assessmentMetrics = {
  created: 0,
  notFound: 0,
  configMissing: 0,
  errors: 0
};
```

This guide should help you debug and fix the 404 error when accessing assessment configuration.
