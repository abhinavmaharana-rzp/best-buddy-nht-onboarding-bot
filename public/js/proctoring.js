/**
 * Proctoring System for Assessments
 * Handles screen recording, violation detection, and assessment monitoring
 */

class ProctoringSystem {
  constructor(config) {
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.isRecording = false;
    this.violations = [];
    this.warnings = 0;
    this.maxWarnings = 3;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.startTime = null;
    this.assessmentStartTime = null;
    
    this.init();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async init() {
    try {
      await this.setupScreenRecording();
      this.setupViolationDetection();
      this.setupEventListeners();
      this.startHeartbeat();
      console.log('Proctoring system initialized');
    } catch (error) {
      console.error('Failed to initialize proctoring system:', error);
      this.notifyError('Failed to initialize proctoring system');
    }
  }

  async setupScreenRecording() {
    if (!this.config.proctoring.screenRecording.enabled) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: this.config.proctoring.screenRecording.frameRate
        },
        audio: false
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStop();
      };

      // Handle stream end (user stops sharing)
      stream.getVideoTracks()[0].onended = () => {
        this.handleStreamEnd();
      };

    } catch (error) {
      console.error('Screen recording setup failed:', error);
      this.notifyError('Screen recording is required for this assessment');
      throw error;
    }
  }

  setupViolationDetection() {
    // Tab switch detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleViolation('tab_switch', 'User switched to another tab');
      }
    });

    // Window focus loss detection
    window.addEventListener('blur', () => {
      this.handleViolation('window_focus_loss', 'Window lost focus');
    });

    // Copy-paste detection
    document.addEventListener('copy', (e) => {
      this.handleViolation('copy_paste', 'Copy operation detected');
    });

    document.addEventListener('paste', (e) => {
      this.handleViolation('copy_paste', 'Paste operation detected');
    });

    // Right-click detection
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleViolation('right_click', 'Right-click detected');
    });

    // Keyboard shortcuts detection
    document.addEventListener('keydown', (e) => {
      const shortcut = this.getKeyboardShortcut(e);
      if (shortcut && !this.config.proctoring.violations.keyboardShortcuts.allowed.includes(shortcut)) {
        this.handleViolation('keyboard_shortcut', `Prohibited keyboard shortcut: ${shortcut}`);
      }
    });

    // Multiple windows detection (basic)
    window.addEventListener('focus', () => {
      this.checkMultipleWindows();
    });
  }

  setupEventListeners() {
    // Prevent common shortcuts
    document.addEventListener('keydown', (e) => {
      const prohibitedKeys = [
        'F12', // Developer tools
        'Ctrl+Shift+I', // Developer tools
        'Ctrl+Shift+J', // Console
        'Ctrl+U', // View source
        'Ctrl+S', // Save
        'Ctrl+A', // Select all
        'Ctrl+C', // Copy
        'Ctrl+V', // Paste
        'Ctrl+X', // Cut
        'Ctrl+Z', // Undo
        'Ctrl+Y', // Redo
        'Ctrl+F', // Find
        'Ctrl+H', // History
        'Ctrl+P', // Print
        'Alt+Tab', // Switch windows
        'Ctrl+Tab', // Switch tabs
        'Ctrl+W', // Close tab
        'Ctrl+T', // New tab
        'Ctrl+N', // New window
        'Ctrl+Shift+N', // Incognito
        'Ctrl+Shift+T', // Reopen tab
        'Ctrl+R', // Refresh (allowed)
        'F5' // Refresh (allowed)
      ];

      const currentShortcut = this.getKeyboardShortcut(e);
      if (prohibitedKeys.includes(currentShortcut)) {
        e.preventDefault();
        this.handleViolation('keyboard_shortcut', `Prohibited shortcut: ${currentShortcut}`);
      }
    });

    // Prevent text selection
    document.addEventListener('selectstart', (e) => {
      e.preventDefault();
    });

    // Prevent drag and drop
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
    });
  }

  getKeyboardShortcut(event) {
    const keys = [];
    if (event.ctrlKey) keys.push('Ctrl');
    if (event.shiftKey) keys.push('Shift');
    if (event.altKey) keys.push('Alt');
    if (event.metaKey) keys.push('Meta');
    
    if (event.key && event.key !== 'Control' && event.key !== 'Shift' && event.key !== 'Alt' && event.key !== 'Meta') {
      keys.push(event.key);
    }
    
    return keys.join('+');
  }

  checkMultipleWindows() {
    // Basic detection - in a real implementation, you'd use more sophisticated methods
    if (window.screenLeft < 0 || window.screenTop < 0) {
      this.handleViolation('multiple_windows', 'Multiple windows detected');
    }
  }

  handleViolation(type, description) {
    const violation = {
      type,
      timestamp: new Date(),
      description,
      severity: this.getViolationSeverity(type)
    };

    this.violations.push(violation);
    this.warnings++;

    console.log('Violation detected:', violation);

    // Send violation to server
    this.reportViolation(violation);

    // Show warning to user
    this.showViolationWarning(violation);

    // Check if assessment should be terminated
    if (this.warnings >= this.maxWarnings) {
      this.terminateAssessment('Maximum violations exceeded');
    }
  }

  getViolationSeverity(type) {
    const severityMap = {
      'tab_switch': 'medium',
      'window_focus_loss': 'low',
      'copy_paste': 'high',
      'right_click': 'high',
      'keyboard_shortcut': 'medium',
      'multiple_windows': 'high'
    };
    return severityMap[type] || 'low';
  }

  showViolationWarning(violation) {
    const warningMessage = this.getWarningMessage();
    this.showNotification(warningMessage, 'warning');
  }

  getWarningMessage() {
    if (this.warnings === 1) {
      return this.config.messages.warnings.firstViolation;
    } else if (this.warnings === 2) {
      return this.config.messages.warnings.secondViolation;
    } else {
      return this.config.messages.warnings.finalWarning;
    }
  }

  async startAssessment() {
    try {
      this.assessmentStartTime = new Date();
      
      // Start screen recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
        this.mediaRecorder.start(1000); // Record in 1-second chunks
        this.isRecording = true;
      }

      // Send start event to server
      await this.sendAssessmentEvent('started', {
        sessionId: this.sessionId,
        startTime: this.assessmentStartTime,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });

      this.showNotification('Assessment started. You are being monitored.', 'info');
      
    } catch (error) {
      console.error('Failed to start assessment:', error);
      this.notifyError('Failed to start assessment');
    }
  }

  async completeAssessment(score, passed) {
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime - this.assessmentStartTime) / 1000);

      // Stop screen recording
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Send completion event to server
      await this.sendAssessmentEvent('completed', {
        sessionId: this.sessionId,
        endTime,
        duration,
        score,
        passed,
        violations: this.violations,
        warnings: this.warnings
      });

      // Show result message
      if (passed) {
        this.showNotification(this.config.messages.success.content, 'success');
      } else {
        this.showNotification(this.config.messages.failure.content, 'error');
      }

    } catch (error) {
      console.error('Failed to complete assessment:', error);
      this.notifyError('Failed to complete assessment');
    }
  }

  terminateAssessment(reason) {
    console.log('Assessment terminated:', reason);
    
    // Stop recording
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    // Send termination event
    this.sendAssessmentEvent('terminated', {
      sessionId: this.sessionId,
      reason,
      violations: this.violations,
      warnings: this.warnings
    });

    this.showNotification(this.config.messages.terminated.content, 'error');
    
    // Redirect or close assessment
    setTimeout(() => {
      window.close();
    }, 3000);
  }

  async handleRecordingStop() {
    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('recording', blob, `recording_${this.sessionId}.webm`);
      formData.append('sessionId', this.sessionId);

      // Upload recording to server
      const response = await fetch('/api/assessment/upload-recording', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }

      const result = await response.json();
      console.log('Recording uploaded:', result);

    } catch (error) {
      console.error('Failed to handle recording stop:', error);
    }
  }

  handleStreamEnd() {
    this.handleViolation('tab_switch', 'Screen sharing ended unexpectedly');
  }

  async sendAssessmentEvent(eventType, data) {
    try {
      const response = await fetch('/api/assessment/event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType,
          sessionId: this.sessionId,
          data
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send assessment event');
      }

    } catch (error) {
      console.error('Failed to send assessment event:', error);
    }
  }

  async reportViolation(violation) {
    try {
      await fetch('/api/assessment/violation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          violation
        })
      });
    } catch (error) {
      console.error('Failed to report violation:', error);
    }
  }

  startHeartbeat() {
    // Send heartbeat every 30 seconds
    setInterval(() => {
      this.sendAssessmentEvent('heartbeat', {
        timestamp: new Date(),
        violations: this.violations.length,
        warnings: this.warnings
      });
    }, 30000);
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `proctoring-notification proctoring-notification-${type}`;
    notification.innerHTML = `
      <div class="proctoring-notification-content">
        <div class="proctoring-notification-icon">
          ${type === 'warning' ? '⚠️' : type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}
        </div>
        <div class="proctoring-notification-message">${message}</div>
      </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  notifyError(message) {
    this.showNotification(message, 'error');
  }

  // Cleanup method
  destroy() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleBlur);
    // ... remove other listeners
    
    console.log('Proctoring system destroyed');
  }
}

// CSS for notifications
const proctoringStyles = `
  .proctoring-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    max-width: 400px;
    animation: slideInRight 0.3s ease-out;
  }

  .proctoring-notification-warning {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    color: #856404;
  }

  .proctoring-notification-error {
    background-color: #f8d7da;
    border: 1px solid #f5c6cb;
    color: #721c24;
  }

  .proctoring-notification-success {
    background-color: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
  }

  .proctoring-notification-info {
    background-color: #d1ecf1;
    border: 1px solid #bee5eb;
    color: #0c5460;
  }

  .proctoring-notification-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .proctoring-notification-icon {
    font-size: 18px;
  }

  .proctoring-notification-message {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = proctoringStyles;
document.head.appendChild(styleSheet);

// Export for use
window.ProctoringSystem = ProctoringSystem;
