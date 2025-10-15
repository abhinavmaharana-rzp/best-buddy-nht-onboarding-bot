/**
 * Face Detection Module for Enhanced Proctoring
 * Uses face-api.js for real-time face detection and monitoring
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

class FaceDetectionProctoring {
  constructor(videoElement, onViolation) {
    this.videoElement = videoElement;
    this.onViolation = onViolation;
    this.isMonitoring = false;
    this.detectionInterval = null;
    this.faceDetectionFails = 0;
    this.maxFaceDetectionFails = 10; // Allow 10 consecutive fails before violation (20 seconds)
    this.multipleFaceWarnings = 0;
    this.lookingAwayCount = 0;
    this.initialized = false;
    
    // Configuration
    this.config = {
      detectionFrequency: 2000, // Check every 2 seconds
      minConfidence: 0.3, // Lower confidence threshold
      maxMultipleFaces: 1,
      requireFacePresence: true
    };
  }

  async initialize() {
    try {
      console.log('🎭 Initializing face detection...');
      
      // Load face-api.js models from CDN
      await this.loadModels();
      
      this.initialized = true;
      console.log('✅ Face detection initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize face detection:', error);
      console.warn('⚠️ Continuing without face detection');
      return false;
    }
  }

  async loadModels() {
    // Load models from CDN
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
    
    try {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
      console.log('✅ Face detection models loaded');
    } catch (error) {
      console.error('❌ Failed to load face detection models:', error);
      throw error;
    }
  }

  start() {
    if (!this.initialized) {
      console.warn('⚠️ Face detection not initialized, skipping');
      return;
    }

    if (this.isMonitoring) {
      console.warn('⚠️ Face detection already running');
      return;
    }

    console.log('👁️ Starting face detection monitoring...');
    this.isMonitoring = true;
    this.runDetection();
  }

  stop() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.isMonitoring = false;
    console.log('🛑 Face detection stopped');
  }

  async runDetection() {
    if (!this.isMonitoring) return;

    try {
      // Check if video element is ready and playing
      if (!this.videoElement || this.videoElement.readyState < 2) {
        console.debug('Video not ready, skipping detection');
        this.scheduleNextDetection();
        return;
      }

      // Run detection with lower confidence threshold
      const detections = await faceapi
        .detectAllFaces(this.videoElement, new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: this.config.minConfidence
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      this.processDetections(detections);
      
    } catch (error) {
      console.debug('Face detection error (non-critical):', error.message);
      // Don't count detection errors as face detection failures
    }
    
    this.scheduleNextDetection();
  }

  scheduleNextDetection() {
    // Schedule next detection
    this.detectionInterval = setTimeout(() => {
      this.runDetection();
    }, this.config.detectionFrequency);
  }

  processDetections(detections) {
    const faceCount = detections.length;
    
    // Check for face presence
    if (faceCount === 0) {
      this.faceDetectionFails++;
      console.debug(`No face detected (${this.faceDetectionFails}/${this.maxFaceDetectionFails})`);
      
      if (this.faceDetectionFails >= this.maxFaceDetectionFails) {
        console.warn(`⚠️ No face detected for ${this.faceDetectionFails} consecutive checks - reporting violation`);
        this.onViolation('no_face_detected', `No face detected for ${this.faceDetectionFails} consecutive checks`);
        this.faceDetectionFails = 0; // Reset after reporting
      }
    } else {
      // Face detected - reset fail counter
      if (this.faceDetectionFails > 0) {
        console.log('✅ Face detected again');
      }
      this.faceDetectionFails = 0;
    }

    // Check for multiple faces
    if (faceCount > this.config.maxMultipleFaces) {
      this.multipleFaceWarnings++;
      console.warn(`⚠️ Multiple faces detected: ${faceCount}`);
      this.onViolation('multiple_faces', `${faceCount} faces detected in frame`);
    }

    // Analyze face position and attention
    if (faceCount === 1) {
      this.analyzeFaceAttention(detections[0]);
    }
  }

  analyzeFaceAttention(detection) {
    try {
      // Get face landmarks
      const landmarks = detection.landmarks;
      const expressions = detection.expressions;
      
      // Check if looking away (simplified heuristic based on face angle)
      // This is a basic implementation - production would use more sophisticated methods
      const leftEye = landmarks.getLeftEye();
      const rightEye = landmarks.getRightEye();
      const nose = landmarks.getNose();
      
      // Calculate approximate head pose
      const eyeCenter = {
        x: (leftEye[0]._x + rightEye[0]._x) / 2,
        y: (leftEye[0]._y + rightEye[0]._y) / 2
      };
      
      const noseCenter = {
        x: nose[3]._x,
        y: nose[3]._y
      };
      
      // If nose is significantly off-center from eyes, user might be looking away
      const horizontalOffset = Math.abs(eyeCenter.x - noseCenter.x);
      const faceWidth = Math.abs(rightEye[3]._x - leftEye[0]._x);
      const offsetRatio = horizontalOffset / faceWidth;
      
      if (offsetRatio > 0.3) {
        this.lookingAwayCount++;
        
        if (this.lookingAwayCount > 3) {
          console.warn('⚠️ User appears to be looking away');
          this.onViolation('looking_away', 'User appears to be looking away from screen');
          this.lookingAwayCount = 0;
        }
      } else {
        this.lookingAwayCount = 0;
      }
      
    } catch (error) {
      // Silently fail - don't disrupt assessment for detection errors
      console.debug('Face attention analysis error:', error);
    }
  }

  // Helper method to draw debug overlay (optional, for testing)
  drawDebugOverlay(canvas, detections) {
    if (!detections || detections.length === 0) return;
    
    const displaySize = {
      width: this.videoElement.width,
      height: this.videoElement.height
    };
    
    faceapi.matchDimensions(canvas, displaySize);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
  }

  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      initialized: this.initialized,
      faceDetectionFails: this.faceDetectionFails,
      multipleFaceWarnings: this.multipleFaceWarnings,
      lookingAwayCount: this.lookingAwayCount
    };
  }
}

// Export for use
window.FaceDetectionProctoring = FaceDetectionProctoring;

