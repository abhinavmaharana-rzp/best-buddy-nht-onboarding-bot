# Email Setup Guide for Manager Reports

This guide explains how to configure email functionality for sending manager reports to `abhinav.maharana@razorpay.com`.

## 📧 Email Configuration

### 1. Environment Variables

Add these variables to your `.env` file:

```bash
# Email Configuration (for manager reports)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password-here
```

### 2. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password as `EMAIL_PASS`

### 3. Alternative Email Providers

You can also use other email providers by modifying the transporter configuration in `services/reportingService.js`:

```javascript
// For Outlook/Hotmail
{
  service: 'hotmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}

// For custom SMTP
{
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
}
```

## 🧪 Testing Email Reports

### 1. Test Script

Run the test script to verify email functionality:

```bash
node test-email-report.js
```

This will send a sample report to `abhinav.maharana@razorpay.com`.

### 2. Manual Testing

You can also test the email functionality through the API:

```bash
# Start the application
node app.js

# In another terminal, trigger a report
curl -X POST http://localhost:3000/api/analytics/trigger-report \
  -H "Content-Type: application/json" \
  -d '{"managerEmail": "abhinav.maharana@razorpay.com"}'
```

## 📊 Report Features

### Email Content Includes:

1. **Summary Statistics**:
   - Total new hires
   - Average progress percentage
   - Assessments passed/failed
   - Overall team health

2. **Individual Progress**:
   - Each new hire's progress
   - Assessment scores
   - Recent activity
   - Areas of concern

3. **Recommendations**:
   - Actionable insights
   - Priority levels
   - Target users

### Email Formats:

- **HTML**: Rich formatting with charts and styling
- **Plain Text**: Fallback for email clients that don't support HTML

## 🔧 Configuration

### Manager List

The system is configured to send reports to these managers:

1. **Abhinav Maharana** - `abhinav.maharana@razorpay.com` (Primary)
2. **John Manager** - `john.manager@razorpay.com`
3. **Jane Manager** - `jane.manager@razorpay.com`

### Report Schedule

Reports are automatically sent:
- **Tuesday** at 9:00 AM (Asia/Kolkata timezone)
- **Thursday** at 9:00 AM (Asia/Kolkata timezone)

### Customization

To modify the manager list, edit `services/schedulerService.js`:

```javascript
async getManagers() {
  return [
    { 
      id: "U_ABHINAV_MAHARANA", 
      name: "Abhinav Maharana", 
      email: "abhinav.maharana@razorpay.com",
      slackId: "U_ABHINAV_MAHARANA"
    },
    // Add more managers here
  ];
}
```

## 🚨 Troubleshooting

### Common Issues:

1. **Authentication Failed**:
   - Check email credentials
   - Verify app password is correct
   - Ensure 2FA is enabled

2. **Connection Timeout**:
   - Check internet connection
   - Verify SMTP settings
   - Try different email provider

3. **Email Not Received**:
   - Check spam folder
   - Verify email address
   - Check email provider settings

### Debug Mode:

Enable debug logging by setting:

```bash
DEBUG=email:*
```

## 📝 Sample Email

The email reports include:

- **Subject**: `📊 Weekly Onboarding Report - [Date]`
- **HTML Content**: Rich formatted report with metrics
- **Plain Text**: Fallback version
- **Attachments**: None (reports are embedded)

## 🔒 Security Notes

1. **Environment Variables**: Never commit email credentials to version control
2. **App Passwords**: Use app-specific passwords, not main account passwords
3. **Access Control**: Limit email access to authorized personnel only
4. **Data Privacy**: Ensure compliance with data protection regulations

---

**Ready to receive your first manager report! 🎉**
