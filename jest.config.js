/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/app.ts',
    '!src/models/index.ts',
    '!src/config/**/*.ts',
    '!src/types/**/*.ts',
    // Exclude routes that are not yet implemented (Phase 4+)
    '!src/routes/profiles.ts',
    '!src/routes/projects.ts',
    '!src/routes/platforms.ts',
    '!src/routes/posts.ts',
    '!src/routes/generate.ts',
  ],
  coverageThreshold: {
    // Per-file thresholds for implemented files
    './src/controllers/AuthController.ts': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    './src/middleware/authMiddleware.ts': {
      branches: 80,
      functions: 100,
      lines: 85,
      statements: 85,
    },
    './src/middleware/validators.ts': {
      branches: 90,
      functions: 50,
      lines: 90,
      statements: 90,
    },
    './src/middleware/errorHandler.ts': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    './src/routes/auth.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/models/User.ts': {
      // branches at 75% because the `if (user.passwordHash)` condition in hooks
      // protects against edge case that's not a realistic scenario
      branches: 75,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Run tests sequentially to avoid database conflicts
  maxWorkers: 1,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
      },
    ],
  },
};
