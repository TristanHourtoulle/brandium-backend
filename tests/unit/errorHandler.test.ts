import { Request, Response, NextFunction } from 'express';
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  DatabaseError,
} from 'sequelize';
import errorHandler, { ApiError } from '../../src/middleware/errorHandler';

// Mock console.error to avoid cluttering test output
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorHandler Middleware Unit Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRequest = {};
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // =====================================
  // Unique Constraint Error Tests (must be tested before ValidationError)
  // UniqueConstraintError extends ValidationError, so order matters
  // =====================================
  describe('Unique Constraint Error', () => {
    it('should return 409 for UniqueConstraintError', () => {
      const error = new UniqueConstraintError({
        errors: [
          {
            message: 'email must be unique',
            type: 'unique violation',
            path: 'email',
            value: 'test@example.com',
            origin: 'DB',
            instance: null,
            validatorKey: 'not_unique',
            validatorName: null,
            validatorArgs: [],
          } as unknown as UniqueConstraintError['errors'][0],
        ],
      });

      errorHandler(
        error as unknown as ApiError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Conflict',
        message: 'Resource already exists',
        details: ['email must be unique'],
      });
    });
  });

  // =====================================
  // Sequelize Validation Error Tests
  // =====================================
  describe('Sequelize Validation Error', () => {
    it('should return 400 for SequelizeValidationError', () => {
      // Create a real SequelizeValidationError instance
      const error = new SequelizeValidationError('Validation error', [
        {
          message: 'Email format is invalid',
          type: 'Validation error',
          path: 'email',
          value: 'test@example.com',
          origin: 'CORE',
          instance: null,
          validatorKey: 'isEmail',
          validatorName: null,
          validatorArgs: [],
        } as unknown as SequelizeValidationError['errors'][0],
      ]);

      errorHandler(
        error as unknown as ApiError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: ['Email format is invalid'],
      });
    });

    it('should handle multiple validation errors', () => {
      const error = new SequelizeValidationError('Multiple validation errors', [
        {
          message: 'Email is required',
          type: 'Validation error',
          path: 'email',
          value: null,
          origin: 'CORE',
          instance: null,
          validatorKey: 'notNull',
          validatorName: null,
          validatorArgs: [],
        } as unknown as SequelizeValidationError['errors'][0],
        {
          message: 'Password is too short',
          type: 'Validation error',
          path: 'password',
          value: '123',
          origin: 'CORE',
          instance: null,
          validatorKey: 'len',
          validatorName: null,
          validatorArgs: [],
        } as unknown as SequelizeValidationError['errors'][0],
      ]);

      errorHandler(
        error as unknown as ApiError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: ['Email is required', 'Password is too short'],
      });
    });
  });

  // =====================================
  // Foreign Key Constraint Error Tests
  // =====================================
  describe('Foreign Key Constraint Error', () => {
    it('should return 400 for ForeignKeyConstraintError', () => {
      const error = new ForeignKeyConstraintError({
        message: 'Foreign key constraint failed',
        table: 'posts',
        fields: { userId: 'some-uuid' },
        value: undefined,
        index: 'posts_userId_fkey',
      });

      errorHandler(
        error as unknown as ApiError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Foreign Key Constraint Error',
        message: 'Referenced resource does not exist',
      });
    });
  });

  // =====================================
  // Database Error Tests
  // =====================================
  describe('Database Error', () => {
    it('should return 500 for DatabaseError in production', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Create a proper DatabaseError parent
      const parentError = {
        name: 'error',
        message: 'Connection failed',
        sql: 'SELECT * FROM users',
      };
      const error = new DatabaseError(parentError);

      errorHandler(
        error as unknown as ApiError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database Error',
        message: 'A database error occurred',
      });

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should include details for DatabaseError in development', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const parentError = {
        name: 'error',
        message: 'Connection timeout',
        sql: 'SELECT * FROM users',
      };
      const error = new DatabaseError(parentError);

      errorHandler(
        error as unknown as ApiError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      const jsonCall = jsonMock.mock.calls[0][0];
      expect(jsonCall.error).toBe('Database Error');
      expect(jsonCall.message).toBe('A database error occurred');
      expect(jsonCall.details).toBeDefined();

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  // =====================================
  // JWT Error Tests
  // =====================================
  describe('JWT Errors', () => {
    it('should return 401 for JsonWebTokenError', () => {
      const jwtError: ApiError = new Error('jwt malformed');
      jwtError.name = 'JsonWebTokenError';

      errorHandler(
        jwtError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
    });

    it('should return 401 for TokenExpiredError', () => {
      const tokenExpiredError: ApiError = new Error('jwt expired');
      tokenExpiredError.name = 'TokenExpiredError';

      errorHandler(
        tokenExpiredError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Token expired',
      });
    });
  });

  // =====================================
  // Default Error Tests
  // =====================================
  describe('Default Error Handling', () => {
    it('should use error status if provided', () => {
      const customError: ApiError = new Error('Custom error');
      customError.status = 403;

      errorHandler(
        customError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Custom error',
      });
    });

    it('should default to 500 if no status provided', () => {
      const genericError: ApiError = new Error('Something went wrong');

      errorHandler(
        genericError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Something went wrong',
      });
    });

    it('should default to "Internal Server Error" if no message', () => {
      const emptyError: ApiError = new Error();
      emptyError.message = '';

      errorHandler(
        emptyError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal Server Error',
      });
    });

    it('should include stack trace in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const errorWithStack: ApiError = new Error('Dev error');
      errorWithStack.stack = 'Error stack trace';

      errorHandler(
        errorWithStack,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      const jsonCall = jsonMock.mock.calls[0][0];
      expect(jsonCall.error).toBe('Dev error');
      expect(jsonCall.stack).toBe('Error stack trace');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should not include stack trace in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const errorWithStack: ApiError = new Error('Prod error');
      errorWithStack.stack = 'Error stack trace';

      errorHandler(
        errorWithStack,
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Prod error',
      });

      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
