import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Set test environment
process.env.NODE_ENV = 'test';

// Ensure JWT_SECRET is set for tests
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only';
}

// Increase timeout for async operations
jest.setTimeout(30000);

// Global beforeAll hook
beforeAll(async () => {
  // Any global setup can go here
});

// Global afterAll hook
afterAll(async () => {
  // Any global cleanup can go here
});
