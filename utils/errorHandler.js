/**
 * Centralized Error Handler
 * 
 * Provides consistent error handling across the application
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

class ErrorHandler {
  constructor() {
    this.errorCodes = {
      // Authentication errors
      AUTH_FAILED: { status: 401, message: 'Authentication failed' },
      UNAUTHORIZED: { status: 403, message: 'Unauthorized access' },
      
      // Resource errors
      NOT_FOUND: { status: 404, message: 'Resource not found' },
      ALREADY_EXISTS: { status: 409, message: 'Resource already exists' },
      
      // Validation errors
      VALIDATION_ERROR: { status: 400, message: 'Validation failed' },
      MISSING_FIELDS: { status: 400, message: 'Required fields missing' },
      INVALID_FORMAT: { status: 400, message: 'Invalid data format' },
      
      // Assessment errors
      ASSESSMENT_NOT_FOUND: { status: 404, message: 'Assessment not found' },
      MAX_ATTEMPTS_EXCEEDED: { status: 400, message: 'Maximum attempts exceeded' },
      ASSESSMENT_IN_PROGRESS: { status: 400, message: 'Assessment already in progress' },
      SESSION_NOT_FOUND: { status: 404, message: 'Proctoring session not found' },
      
      // Recording errors
      RECORDING_FAILED: { status: 500, message: 'Recording upload failed' },
      RECORDING_NOT_FOUND: { status: 404, message: 'Recording not found' },
      
      // Server errors
      SERVER_ERROR: { status: 500, message: 'Internal server error' },
      DATABASE_ERROR: { status: 500, message: 'Database operation failed' },
    };
  }

  /**
   * Create standardized error response
   */
  createError(code, details = null, context = null) {
    const errorDef = this.errorCodes[code] || this.errorCodes.SERVER_ERROR;
    
    const error = {
      success: false,
      error: {
        code: code,
        message: errorDef.message,
        status: errorDef.status,
        ...(details && { details }),
        ...(context && { context }),
        timestamp: new Date().toISOString()
      }
    };
    
    return error;
  }

  /**
   * Express middleware for handling errors
   */
  expressMiddleware() {
    return (err, req, res, next) => {
      console.error('❌ Error:', err);
      
      // Determine error type
      let errorCode = 'SERVER_ERROR';
      let details = err.message;
      
      if (err.name === 'ValidationError') {
        errorCode = 'VALIDATION_ERROR';
        details = Object.values(err.errors).map(e => e.message).join(', ');
      } else if (err.name === 'CastError') {
        errorCode = 'INVALID_FORMAT';
        details = 'Invalid ID format';
      } else if (err.code === 11000) {
        errorCode = 'ALREADY_EXISTS';
        details = 'Duplicate entry';
      }
      
      const error = this.createError(errorCode, details, {
        path: req.path,
        method: req.method
      });
      
      res.status(error.error.status).json(error);
    };
  }

  /**
   * Async handler wrapper to catch errors
   */
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * Log error with context
   */
  logError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };
    
    console.error('❌ Error Log:', JSON.stringify(logEntry, null, 2));
    
    // In production, you could send this to a logging service
    // e.g., Sentry, LogRocket, CloudWatch, etc.
  }

  /**
   * User-friendly error messages
   */
  getUserFriendlyMessage(error) {
    const friendlyMessages = {
      AUTH_FAILED: 'Please log in to continue',
      UNAUTHORIZED: 'You don\'t have permission to perform this action',
      NOT_FOUND: 'The requested item could not be found',
      VALIDATION_ERROR: 'Please check your input and try again',
      MAX_ATTEMPTS_EXCEEDED: 'You have used all available attempts for this assessment',
      RECORDING_FAILED: 'Recording upload failed. Please check your connection and try again',
      SERVER_ERROR: 'Something went wrong. Please try again later'
    };
    
    return friendlyMessages[error.code] || friendlyMessages.SERVER_ERROR;
  }
}

module.exports = new ErrorHandler();

