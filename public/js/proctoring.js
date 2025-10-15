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
    this.screenRecorder = null;
    this.webcamRecorder = null;
    this.screenChunks = [];
    this.webcamChunks = [];
    this.screenStream = null;
    this.webcamStream = null;
    this.startTime = null;
    this.assessmentStartTime = null;
    this.faceDetection = null;
    this.webcamVideoElement = null;
    
    this.init();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async init() {
    try {
      await this.setupScreenRecording();
      await this.setupFaceDetection();
      this.setupViolationDetection();
      this.setupEventListeners();
      this.startHeartbeat();
      console.log('✅ Proctoring system initialized successfully');
      // Note: Not showing notification here - will show when assessment actually starts
    } catch (error) {
      console.error('❌ Failed to initialize proctoring system:', error);
      this.notifyError('Failed to initialize proctoring system. Please refresh and try again.');
      throw error;
    }
  }

  async setupScreenRecording() {
    if (!this.config.proctoring.screenRecording.enabled) return;

    try {
      // Request screen recording permission
      console.log('Requesting screen recording permission...');
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: this.config.proctoring.screenRecording.frameRate
        },
        audio: false
      });

      // Request webcam permission
      console.log('Requesting webcam permission...');
      this.webcamStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: 15
        },
        audio: false
      });

      // Setup screen recorder with chunked upload
      this.screenRecorder = new MediaRecorder(this.screenStream, {
        mimeType: 'video/webm;codecs=vp8'
      });

      this.screenRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.screenChunks.push(event.data);
          
          // Upload chunk if size threshold reached (10 seconds worth ~5MB)
          if (this.screenChunks.length >= 10 && this.isRecording) {
            await this.uploadChunk('screen', this.screenChunks.slice());
            this.screenChunks = []; // Clear uploaded chunks
          }
        }
      };

      this.screenRecorder.onstop = () => {
        this.handleScreenRecordingStop();
      };

      // Setup webcam recorder with chunked upload
      this.webcamRecorder = new MediaRecorder(this.webcamStream, {
        mimeType: 'video/webm;codecs=vp8'
      });

      this.webcamRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          this.webcamChunks.push(event.data);
          
          // Upload chunk if size threshold reached
          if (this.webcamChunks.length >= 10 && this.isRecording) {
            await this.uploadChunk('webcam', this.webcamChunks.slice());
            this.webcamChunks = []; // Clear uploaded chunks
          }
        }
      };

      this.webcamRecorder.onstop = () => {
        this.handleWebcamRecordingStop();
      };

      // Handle stream end (user stops sharing)
      this.screenStream.getVideoTracks()[0].onended = () => {
        this.handleStreamEnd();
      };

      console.log('✅ Both screen and webcam recording setup complete');
      // Note: Don't show notification during init - will show when recording actually starts

    } catch (error) {
      console.error('Recording setup failed:', error);
      this.notifyError('Screen and camera recording are required for this proctored assessment. Please allow both permissions.');
      throw error;
    }
  }

  async setupFaceDetection() {
    try {
      // Create visible video element for face detection (required for face-api.js)
      this.webcamVideoElement = document.createElement('video');
      this.webcamVideoElement.autoplay = true;
      this.webcamVideoElement.muted = true;
      this.webcamVideoElement.playsInline = true;
      
      // Style the video element to be visible but small
      this.webcamVideoElement.style.position = 'fixed';
      this.webcamVideoElement.style.top = '20px';
      this.webcamVideoElement.style.right = '20px';
      this.webcamVideoElement.style.width = '200px';
      this.webcamVideoElement.style.height = '150px';
      this.webcamVideoElement.style.border = '2px solid #4CAF50';
      this.webcamVideoElement.style.borderRadius = '8px';
      this.webcamVideoElement.style.zIndex = '1000';
      this.webcamVideoElement.style.backgroundColor = '#000';
      
      // Add a label
      const label = document.createElement('div');
      label.textContent = '📹 Camera Feed';
      label.style.position = 'fixed';
      label.style.top = '10px';
      label.style.right = '20px';
      label.style.color = '#4CAF50';
      label.style.fontSize = '12px';
      label.style.fontWeight = 'bold';
      label.style.zIndex = '1001';
      label.id = 'camera-label';
      
      document.body.appendChild(label);
      document.body.appendChild(this.webcamVideoElement);
      
      // Attach webcam stream to video element
      if (this.webcamStream) {
        this.webcamVideoElement.srcObject = this.webcamStream;
        
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Camera video failed to load'));
          }, 10000); // 10 second timeout
          
          this.webcamVideoElement.onloadedmetadata = () => {
            clearTimeout(timeout);
            this.webcamVideoElement.play().then(() => {
              console.log('✅ Camera video started playing');
              resolve();
            }).catch(reject);
          };
          
          this.webcamVideoElement.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
      } else {
        throw new Error('No webcam stream available');
      }
      
      // Check if face-api.js is loaded
      if (typeof faceapi !== 'undefined') {
        this.faceDetection = new FaceDetectionProctoring(
          this.webcamVideoElement,
          (type, description) => this.handleViolation(type, description)
        );
        
        // Initialize face detection
        const initialized = await this.faceDetection.initialize();
        if (initialized) {
          console.log('✅ Face detection setup complete');
        } else {
          console.warn('⚠️ Face detection setup failed, continuing without it');
        }
      } else {
        console.warn('⚠️ face-api.js not loaded, skipping face detection');
      }
      
      console.log('✅ Camera setup complete - video element is ready');
      
    } catch (error) {
      console.error('❌ Face detection setup failed:', error);
      console.warn('⚠️ Continuing without face detection');
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

    console.log(`⚠️ Violation #${this.violations.length} detected:`, violation);
    console.log(`📊 Total violations: ${this.violations.length}, Warnings: ${this.warnings}/${this.maxWarnings}`);

    // Send violation to server
    this.reportViolation(violation);

    // Show warning to user
    this.showViolationWarning(violation);

    // Check if assessment should be terminated
    if (this.warnings >= this.maxWarnings) {
      console.error(`🚫 Maximum warnings (${this.maxWarnings}) exceeded - terminating assessment`);
      this.terminateAssessment('Maximum violations exceeded');
    }
  }

  cleanupCameraElements() {
    // Remove camera video element
    if (this.webcamVideoElement && this.webcamVideoElement.parentNode) {
      this.webcamVideoElement.parentNode.removeChild(this.webcamVideoElement);
    }
    
    // Remove camera label
    const label = document.getElementById('camera-label');
    if (label && label.parentNode) {
      label.parentNode.removeChild(label);
    }
    
    console.log('🧹 Camera elements cleaned up');
  }

  getViolationSeverity(type) {
    const severityMap = {
      'tab_switch': 'medium',
      'window_focus_loss': 'low',
      'copy_paste': 'high',
      'right_click': 'high',
      'keyboard_shortcut': 'medium',
      'multiple_windows': 'high',
      'no_face_detected': 'low',
      'multiple_faces': 'medium',
      'looking_away': 'low'
    };
    return severityMap[type] || 'low';
  }

  showViolationWarning(violation) {
    const warningMessage = this.getWarningMessage();
    this.showNotification(warningMessage, 'warning');
  }

  getWarningMessage() {
    // Default warning messages
    const defaultWarnings = {
      firstViolation: "This is your first warning. Please focus on the assessment.",
      secondViolation: "This is your second warning. Further violations may result in assessment termination.",
      finalWarning: "This is your final warning. Any further violations will result in immediate assessment termination."
    };
    
    // Get warnings from config or use defaults
    const warnings = this.config?.messages?.warnings || defaultWarnings;
    
    if (this.warnings === 1) {
      return warnings.firstViolation || defaultWarnings.firstViolation;
    } else if (this.warnings === 2) {
      return warnings.secondViolation || defaultWarnings.secondViolation;
    } else {
      return warnings.finalWarning || defaultWarnings.finalWarning;
    }
  }

  async startAssessment() {
    try {
      this.assessmentStartTime = new Date();
      
      // Start both screen and webcam recording
      if (this.screenRecorder && this.screenRecorder.state === 'inactive') {
        this.screenRecorder.start(1000); // Record in 1-second chunks
        console.log('✅ Screen recording started');
      }
      
      if (this.webcamRecorder && this.webcamRecorder.state === 'inactive') {
        this.webcamRecorder.start(1000); // Record in 1-second chunks
        console.log('✅ Webcam recording started');
      }
      
      this.isRecording = true;

      // Start face detection monitoring
      if (this.faceDetection) {
        this.faceDetection.start();
        console.log('👁️ Face detection monitoring started');
      }

      // Send start event to server
      await this.sendAssessmentEvent('started', {
        sessionId: this.sessionId,
        startTime: this.assessmentStartTime,
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        faceDetectionEnabled: this.faceDetection !== null
      });

      this.showNotification('Assessment started. Screen and camera recording in progress with AI monitoring.', 'info');
      
    } catch (error) {
      console.error('Failed to start assessment:', error);
      this.notifyError('Failed to start assessment');
    }
  }

  async completeAssessment(score, passed) {
    try {
      const endTime = new Date();
      const duration = Math.floor((endTime - this.assessmentStartTime) / 1000);

      // Stop both screen and webcam recording
      if (this.screenRecorder && this.screenRecorder.state === 'recording') {
        this.screenRecorder.stop();
        console.log('🛑 Screen recording stopped');
      }
      
      if (this.webcamRecorder && this.webcamRecorder.state === 'recording') {
        this.webcamRecorder.stop();
        console.log('🛑 Webcam recording stopped');
      }
      
      // Stop face detection
      if (this.faceDetection) {
        this.faceDetection.stop();
        console.log('👁️ Face detection stopped');
      }
      
      // Clean up camera elements
      this.cleanupCameraElements();
      
      // Stop streams
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
      }
      if (this.webcamStream) {
        this.webcamStream.getTracks().forEach(track => track.stop());
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
    
    // Stop both recordings
    if (this.screenRecorder && this.screenRecorder.state === 'recording') {
      this.screenRecorder.stop();
    }
    
    if (this.webcamRecorder && this.webcamRecorder.state === 'recording') {
      this.webcamRecorder.stop();
    }
    
    // Clean up camera elements
    this.cleanupCameraElements();
    
    // Stop streams
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
    }
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
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

  async handleScreenRecordingStop() {
    try {
      const blob = new Blob(this.screenChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('screenRecording', blob, `screen_${this.sessionId}.webm`);
      formData.append('sessionId', this.sessionId);
      formData.append('recordingType', 'screen');

      // Upload recording to server
      const response = await fetch('/api/assessment/upload-recording', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload screen recording');
      }

      const result = await response.json();
      console.log('Screen recording uploaded:', result);

    } catch (error) {
      console.error('Failed to upload screen recording:', error);
    }
  }

  async handleWebcamRecordingStop() {
    try {
      // Upload any remaining chunks
      if (this.webcamChunks.length > 0) {
        await this.uploadChunk('webcam', this.webcamChunks);
      }
      
      const blob = new Blob(this.webcamChunks, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('webcamRecording', blob, `webcam_${this.sessionId}.webm`);
      formData.append('sessionId', this.sessionId);
      formData.append('recordingType', 'webcam');
      formData.append('isFinal', 'true');

      // Upload final recording to server
      const response = await fetch('/api/assessment/upload-recording', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload webcam recording');
      }

      const result = await response.json();
      console.log('Webcam recording uploaded:', result);

    } catch (error) {
      console.error('Failed to upload webcam recording:', error);
    }
  }

  async uploadChunk(type, chunks) {
    try {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const timestamp = Date.now();
      
      const formData = new FormData();
      formData.append('chunk', blob, `${type}_${this.sessionId}_${timestamp}.webm`);
      formData.append('sessionId', this.sessionId);
      formData.append('recordingType', type);
      formData.append('chunkTimestamp', timestamp);
      formData.append('isChunk', 'true');

      const response = await fetch('/api/assessment/upload-chunk', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        console.log(`✅ ${type} chunk uploaded: ${timestamp}`);
      } else {
        console.error(`❌ Failed to upload ${type} chunk`);
      }
    } catch (error) {
      console.error(`Error uploading ${type} chunk:`, error);
      // Don't throw - allow recording to continue even if upload fails
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
    if (this.screenRecorder && this.screenRecorder.state === 'recording') {
      this.screenRecorder.stop();
    }
    
    if (this.webcamRecorder && this.webcamRecorder.state === 'recording') {
      this.webcamRecorder.stop();
    }
    
    // Stop all streams
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
    }
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach(track => track.stop());
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
