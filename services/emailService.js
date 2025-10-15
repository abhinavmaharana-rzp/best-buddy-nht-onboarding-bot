/**
 * Email Service
 * 
 * Handles sending email notifications for assessment completions and other events
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialize();
  }

  initialize() {
    // Create transporter using environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    console.log('✅ Email service initialized');
  }

  /**
   * Send assessment completion email
   */
  async sendAssessmentCompletionEmail(userEmail, userName, assessmentData) {
    try {
      const { taskTitle, score, rawScore, totalQuestions, passed } = assessmentData;
      
      const scoreDisplay = rawScore && totalQuestions 
        ? `${rawScore}/${totalQuestions} (${score}%)`
        : `${score}%`;

      const subject = passed 
        ? `✅ Assessment Passed: ${taskTitle}`
        : `📊 Assessment Completed: ${taskTitle}`;

      const htmlContent = passed 
        ? this.getPassedEmailTemplate(userName, taskTitle, scoreDisplay)
        : this.getFailedEmailTemplate(userName, taskTitle, scoreDisplay);

      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Onboarding System'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: userEmail,
        subject: subject,
        html: htmlContent,
        text: this.getPlainTextVersion(userName, taskTitle, scoreDisplay, passed)
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${userEmail}: ${info.messageId}`);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  getPassedEmailTemplate(userName, taskTitle, scoreDisplay) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; }
          .score-box { background: #d1fae5; border: 2px solid #059669; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .score { font-size: 36px; font-weight: bold; color: #065f46; }
          .footer { background: #e5e7eb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6b7280; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Great news! You have successfully completed the proctored assessment for <strong>"${taskTitle}"</strong>!</p>
            
            <div class="score-box">
              <div class="score">${scoreDisplay}</div>
              <p style="margin: 10px 0 0 0; color: #065f46; font-weight: 600;">✅ PASSED</p>
            </div>
            
            <p>Your results have been recorded and you can proceed to the next task in your onboarding journey.</p>
            
            <p><strong>What's Next:</strong></p>
            <ul>
              <li>Continue with your assigned onboarding tasks</li>
              <li>Check your Slack for the next steps</li>
              <li>Keep up the great work!</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message from the Onboarding System</p>
            <p>If you have any questions, please contact your manager or HR team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getFailedEmailTemplate(userName, taskTitle, scoreDisplay) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; }
          .score-box { background: #fee2e2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .score { font-size: 36px; font-weight: bold; color: #991b1b; }
          .footer { background: #e5e7eb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6b7280; }
          .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Assessment Results</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>You have completed the proctored assessment for <strong>"${taskTitle}"</strong>.</p>
            
            <div class="score-box">
              <div class="score">${scoreDisplay}</div>
              <p style="margin: 10px 0 0 0; color: #991b1b; font-weight: 600;">Required: 80%</p>
            </div>
            
            <p>Unfortunately, you did not achieve the required passing score. Don't worry - this is a learning opportunity!</p>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Review the study materials for this topic</li>
              <li>Take some time to understand the concepts better</li>
              <li>You can retake the assessment when you're ready</li>
              <li>Don't hesitate to ask questions in Slack</li>
            </ul>
            
            <p>You've got this! Keep learning and try again when you're prepared.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Onboarding System</p>
            <p>If you need help, reach out to your manager or the HR team</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPlainTextVersion(userName, taskTitle, scoreDisplay, passed) {
    if (passed) {
      return `
Hi ${userName},

Congratulations! You have successfully completed the proctored assessment for "${taskTitle}"!

Your Score: ${scoreDisplay}
Status: PASSED

Your results have been recorded and you can proceed to the next task in your onboarding journey.

What's Next:
- Continue with your assigned onboarding tasks
- Check your Slack for the next steps
- Keep up the great work!

---
This is an automated message from the Onboarding System
      `.trim();
    } else {
      return `
Hi ${userName},

You have completed the proctored assessment for "${taskTitle}".

Your Score: ${scoreDisplay}
Required: 80%

Unfortunately, you did not achieve the required passing score. Don't worry - this is a learning opportunity!

Next Steps:
- Review the study materials for this topic
- Take some time to understand the concepts better
- You can retake the assessment when you're ready
- Don't hesitate to ask questions in Slack

You've got this! Keep learning and try again when you're prepared.

---
This is an automated message from the Onboarding System
      `.trim();
    }
  }

  /**
   * Send generic notification email
   */
  async sendNotification(to, subject, htmlContent, textContent) {
    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || 'Onboarding System'}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent: ${info.messageId}`);
      
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify email configuration
   */
  async verify() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send messages');
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();

