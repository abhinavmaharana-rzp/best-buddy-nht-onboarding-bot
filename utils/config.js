/**
 * Configuration Utility
 * 
 * This module provides centralized configuration management for the application,
 * including environment-specific settings and URL generation.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

/**
 * Get the base URL for the application
 * Handles different deployment environments (local, Railway, Heroku, etc.)
 * @returns {string} The base URL for the application
 */
function getBaseUrl() {
  // Priority order for base URL detection:
  // 1. Explicit BASE_URL environment variable
  // 2. Railway's RAILWAY_PUBLIC_DOMAIN
  // 3. Heroku's DYNO environment (if available)
  // 4. PORT-based localhost detection
  // 5. Default localhost fallback
  
  if (process.env.BASE_URL) {
    return process.env.BASE_URL;
  }
  
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  
  if (process.env.HEROKU_APP_NAME) {
    return `https://${process.env.HEROKU_APP_NAME}.herokuapp.com`;
  }
  
  // For local development
  const port = process.env.PORT || 3000;
  return `http://localhost:${port}`;
}

/**
 * Get the public URL for assessment links
 * This ensures assessment links work correctly in all environments
 * @returns {string} The public URL for assessments
 */
function getAssessmentUrl(assessmentId, sessionId) {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/assessment.html?assessmentId=${assessmentId}&sessionId=${sessionId}`;
}

/**
 * Get the API base URL
 * @returns {string} The API base URL
 */
function getApiBaseUrl() {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/api`;
}

/**
 * Check if running in production environment
 * @returns {boolean} True if in production
 */
function isProduction() {
  return process.env.NODE_ENV === 'production' || 
         process.env.RAILWAY_ENVIRONMENT === 'production' ||
         process.env.HEROKU_APP_NAME !== undefined;
}

/**
 * Get environment-specific configuration
 * @returns {Object} Environment configuration
 */
function getEnvironmentConfig() {
  return {
    baseUrl: getBaseUrl(),
    apiBaseUrl: getApiBaseUrl(),
    isProduction: isProduction(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
  };
}

module.exports = {
  getBaseUrl,
  getAssessmentUrl,
  getApiBaseUrl,
  isProduction,
  getEnvironmentConfig,
};
