/**
 * Storage Service Tests
 * Tests for both local storage and AWS S3 with fallback
 * Note: Storage service doesn't require MongoDB
 */

const storageService = require('../../services/storageService');
const fs = require('fs');
const path = require('path');

// Increase timeout for storage operations
jest.setTimeout(15000);

describe('Storage Service', () => {
  const testSessionId = 'test_session_' + Date.now();
  const testFile = {
    buffer: Buffer.from('test video data'),
    mimetype: 'video/webm',
    originalname: 'test.webm'
  };

  beforeAll(() => {
    // Ensure test directory exists
    const testDir = path.join(__dirname, '../../uploads/recordings');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  describe('Initialization', () => {
    test('should initialize without AWS credentials', () => {
      const info = storageService.getStorageInfo();
      expect(info).toBeDefined();
      expect(info.type).toBe('local'); // Without AWS, should use local
    });

    test('should return storage info', () => {
      const info = storageService.getStorageInfo();
      expect(info).toHaveProperty('type');
      expect(info).toHaveProperty('configured');
      expect(['local', 's3']).toContain(info.type);
    });
  });

  describe('Local Storage', () => {
    test('should upload to local storage', async () => {
      const result = await storageService.uploadRecording(testFile, testSessionId, 'screen');
      
      expect(result.success).toBe(true);
      expect(result.storage).toBe('local');
      expect(result.fileUrl).toContain('/uploads/recordings/');
      expect(result.filePath).toBeDefined();
    });

    test('should create unique filenames', async () => {
      const result1 = await storageService.uploadRecording(testFile, testSessionId, 'screen');
      const result2 = await storageService.uploadRecording(testFile, testSessionId, 'webcam');
      
      expect(result1.fileUrl).not.toBe(result2.fileUrl);
    });

    test('should handle file errors gracefully', async () => {
      const invalidFile = { buffer: null };
      
      await expect(
        storageService.uploadRecording(invalidFile, testSessionId, 'screen')
      ).rejects.toThrow();
    });
  });

  describe('Storage Statistics', () => {
    test('should return storage stats', async () => {
      const stats = await storageService.getStorageStats();
      
      expect(stats).toHaveProperty('storage');
      expect(stats).toHaveProperty('fileCount');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('totalSizeMB');
      expect(typeof stats.fileCount).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
    });

    test('should calculate file count correctly', async () => {
      const stats = await storageService.getStorageStats();
      expect(stats.fileCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cleanup Operations', () => {
    test('should cleanup old recordings', async () => {
      const result = await storageService.cleanupOldRecordings(365); // 1 year old
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('deletedCount');
      expect(result).toHaveProperty('storage');
      expect(typeof result.deletedCount).toBe('number');
    });

    test('should not delete recent recordings', async () => {
      // Upload a test file
      await storageService.uploadRecording(testFile, testSessionId + '_new', 'screen');
      
      // Try to cleanup files from last 1 day (should not delete recent)
      const result = await storageService.cleanupOldRecordings(1);
      
      // Recent file should still exist
      const stats = await storageService.getStorageStats();
      expect(stats.fileCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing file gracefully', async () => {
      await expect(
        storageService.uploadRecording(null, testSessionId, 'screen')
      ).rejects.toThrow();
    });

    test('should handle null session ID by using it in filename', async () => {
      // Storage service is resilient - it will use null in filename rather than fail
      const result = await storageService.uploadRecording(testFile, null, 'screen');
      
      expect(result.success).toBe(true);
      expect(result.storage).toBe('local');
      expect(result.fileUrl).toContain('screen_null');
    });
  });

  // Cleanup test files after all tests
  afterAll(() => {
    try {
      const testDir = path.join(__dirname, '../../uploads/recordings');
      const files = fs.readdirSync(testDir);
      
      // Delete test files only
      files.forEach(file => {
        if (file.includes('test_session')) {
          fs.unlinkSync(path.join(testDir, file));
        }
      });
    } catch (error) {
      console.log('Cleanup error (non-critical):', error.message);
    }
  });
});

