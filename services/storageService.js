/**
 * Storage Service with AWS S3 and Local Fallback
 * 
 * Automatically uses S3 if configured, otherwise falls back to local storage.
 * No breaking changes - works without AWS credentials.
 * 
 * @author Abhinav Maharana
 * @version 1.0.0
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

class StorageService {
  constructor() {
    this.s3Client = null;
    this.useS3 = false;
    this.bucketName = process.env.AWS_S3_BUCKET;
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.localStoragePath = path.join(__dirname, '../uploads/recordings');
    
    this.initialize();
  }

  /**
   * Initialize storage service
   * Tries to configure S3, falls back to local if not available
   */
  initialize() {
    try {
      // Check if AWS credentials are configured
      if (process.env.AWS_ACCESS_KEY_ID && 
          process.env.AWS_SECRET_ACCESS_KEY && 
          process.env.AWS_S3_BUCKET) {
        
        // Configure AWS S3 v3 client
        this.s3Client = new S3Client({
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
          region: this.region
        });
        
        this.useS3 = true;
        
        console.log('✅ Storage Service: Using AWS S3');
        console.log(`   Bucket: ${this.bucketName}`);
        console.log(`   Region: ${process.env.AWS_REGION || 'us-east-1'}`);
        
      } else {
        // Fall back to local storage
        this.useS3 = false;
        this.ensureLocalStorageExists();
        
        console.log('ℹ️  Storage Service: Using Local File System');
        console.log(`   Path: ${this.localStoragePath}`);
        console.log('   💡 To use S3: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET in .env');
      }
    } catch (error) {
      console.error('⚠️  AWS S3 initialization failed, falling back to local storage:', error.message);
      this.useS3 = false;
      this.ensureLocalStorageExists();
    }
  }

  /**
   * Ensure local storage directory exists
   */
  ensureLocalStorageExists() {
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
      console.log(`📁 Created local storage directory: ${this.localStoragePath}`);
    }
  }

  /**
   * Upload file (automatically chooses S3 or local)
   */
  async uploadRecording(file, sessionId, recordingType) {
    try {
      if (this.useS3) {
        return await this.uploadToS3(file, sessionId, recordingType);
      } else {
        return await this.uploadToLocal(file, sessionId, recordingType);
      }
    } catch (error) {
      console.error(`❌ Upload failed, trying fallback:`, error.message);
      
      // If S3 fails, try local as fallback
      if (this.useS3) {
        console.log('⚠️  S3 upload failed, falling back to local storage');
        return await this.uploadToLocal(file, sessionId, recordingType);
      }
      
      throw error;
    }
  }

  /**
   * Upload to AWS S3
   */
  async uploadToS3(file, sessionId, recordingType) {
    const timestamp = Date.now();
    const key = `recordings/${sessionId}/${recordingType}_${timestamp}.webm`;
    
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer || fs.createReadStream(file.path),
      ContentType: file.mimetype || 'video/webm',
      Metadata: {
        sessionId: sessionId,
        recordingType: recordingType,
        uploadedAt: new Date().toISOString()
      }
    });
    
    await this.s3Client.send(command);
    
    console.log(`✅ Uploaded to S3: ${key}`);
    
    return {
      success: true,
      storage: 's3',
      fileUrl: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`,
      key: key,
      bucket: this.bucketName
    };
  }

  /**
   * Upload to local file system
   */
  async uploadToLocal(file, sessionId, recordingType) {
    const timestamp = Date.now();
    const filename = `${recordingType}_${sessionId}_${timestamp}.webm`;
    const filePath = path.join(this.localStoragePath, filename);
    
    // If file is already saved by multer, just return the path
    if (file.path && fs.existsSync(file.path)) {
      const newPath = path.join(this.localStoragePath, filename);
      
      // Copy to organized location if needed
      if (file.path !== newPath) {
        fs.copyFileSync(file.path, newPath);
        fs.unlinkSync(file.path); // Remove original
      }
      
      console.log(`✅ Saved to local storage: ${filename}`);
      
      return {
        success: true,
        storage: 'local',
        fileUrl: `/uploads/recordings/${filename}`,
        filePath: newPath
      };
    }
    
    // Otherwise write buffer to file
    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
      
      console.log(`✅ Saved to local storage: ${filename}`);
      
      return {
        success: true,
        storage: 'local',
        fileUrl: `/uploads/recordings/${filename}`,
        filePath: filePath
      };
    }
    
    throw new Error('No file data available to save');
  }

  /**
   * Get signed URL for S3 objects (for private access)
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (!this.useS3) {
      // For local storage, return the direct path
      return `/uploads/recordings/${path.basename(key)}`;
    }
    
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });
      
      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete recording (both S3 and local)
   */
  async deleteRecording(fileUrl) {
    try {
      if (this.useS3 && fileUrl.includes('amazonaws.com')) {
        // Extract key from S3 URL
        const key = fileUrl.split('.com/')[1];
        
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key
        });
        
        await this.s3Client.send(command);
        
        console.log(`🗑️  Deleted from S3: ${key}`);
        return { success: true, storage: 's3' };
        
      } else {
        // Delete from local storage
        const filename = path.basename(fileUrl);
        const filePath = path.join(this.localStoragePath, filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️  Deleted from local storage: ${filename}`);
          return { success: true, storage: 'local' };
        }
      }
      
      return { success: false, error: 'File not found' };
    } catch (error) {
      console.error('Error deleting recording:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup old recordings (older than specified days)
   */
  async cleanupOldRecordings(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      if (this.useS3) {
        return await this.cleanupS3Recordings(cutoffDate);
      } else {
        return await this.cleanupLocalRecordings(cutoffDate);
      }
    } catch (error) {
      console.error('Error cleaning up old recordings:', error);
      return { success: false, error: error.message };
    }
  }

  async cleanupS3Recordings(cutoffDate) {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: 'recordings/'
    });
    
    const data = await this.s3Client.send(command);
    let deletedCount = 0;
    
    for (const object of data.Contents || []) {
      if (object.LastModified < cutoffDate) {
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: object.Key
        });
        
        await this.s3Client.send(deleteCommand);
        deletedCount++;
      }
    }
    
    console.log(`🗑️  Cleaned up ${deletedCount} old recordings from S3`);
    return { success: true, deletedCount, storage: 's3' };
  }

  async cleanupLocalRecordings(cutoffDate) {
    const files = fs.readdirSync(this.localStoragePath);
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(this.localStoragePath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    console.log(`🗑️  Cleaned up ${deletedCount} old recordings from local storage`);
    return { success: true, deletedCount, storage: 'local' };
  }

  /**
   * Get storage info
   */
  getStorageInfo() {
    return {
      type: this.useS3 ? 's3' : 'local',
      bucket: this.useS3 ? this.bucketName : null,
      region: this.useS3 ? (process.env.AWS_REGION || 'us-east-1') : null,
      path: !this.useS3 ? this.localStoragePath : null,
      configured: this.useS3
    };
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      if (this.useS3) {
        const params = {
          Bucket: this.bucketName,
          Prefix: 'recordings/'
        };
        
        const data = await this.s3Client.listObjectsV2(params).promise();
        const totalSize = data.Contents?.reduce((sum, obj) => sum + obj.Size, 0) || 0;
        
        return {
          storage: 's3',
          fileCount: data.Contents?.length || 0,
          totalSize: totalSize,
          totalSizeMB: Math.round(totalSize / 1024 / 1024),
          bucket: this.bucketName
        };
      } else {
        // Local storage stats
        const files = fs.readdirSync(this.localStoragePath);
        let totalSize = 0;
        
        files.forEach(file => {
          const stats = fs.statSync(path.join(this.localStoragePath, file));
          totalSize += stats.size;
        });
        
        return {
          storage: 'local',
          fileCount: files.length,
          totalSize: totalSize,
          totalSizeMB: Math.round(totalSize / 1024 / 1024),
          path: this.localStoragePath
        };
      }
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { error: error.message };
    }
  }
}

module.exports = new StorageService();

