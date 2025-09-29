const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup test database
beforeAll(async () => {
  // Close any existing connections
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Close database connection after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.SLACK_BOT_TOKEN = 'xoxb-test-token';
process.env.SLACK_SIGNING_SECRET = 'test-signing-secret';
process.env.SLACK_APP_TOKEN = 'xapp-test-token';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.BASE_URL = 'http://localhost:3000';
process.env.ADMIN_CHANNEL = '#test-admin';

// Mock Slack client
jest.mock('@slack/bolt', () => ({
  App: jest.fn().mockImplementation(() => ({
    start: jest.fn().mockResolvedValue(true),
    client: {
      chat: {
        postMessage: jest.fn().mockResolvedValue({ ok: true }),
      },
      users: {
        info: jest.fn().mockResolvedValue({
          ok: true,
          user: {
            profile: {
              real_name: 'Test User',
              email: 'test@example.com',
            },
          },
        }),
        lookupByEmail: jest.fn().mockResolvedValue({
          ok: true,
          user: { id: 'U1234567890' },
        }),
      },
    },
    command: jest.fn(),
    action: jest.fn(),
  })),
}));

// Mock multer
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = {
        filename: 'test-recording.webm',
        path: '/uploads/test-recording.webm',
        mimetype: 'video/webm',
        size: 1024,
      };
      next();
    },
  });
  multer.diskStorage = jest.fn();
  return multer;
});

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
  getTasks: jest.fn().mockReturnValue([]),
}));

// Mock fetch
global.fetch = jest.fn();

module.exports = {
  mongoServer,
};
