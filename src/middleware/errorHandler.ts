import { Request, Response, NextFunction } from 'express';
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError,
  ForeignKeyConstraintError,
  DatabaseError,
} from 'sequelize';

/**
 * Custom API Error interface
 */
export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

/**
 * Global error handling middleware
 * Must be registered LAST in the middleware chain
 */
const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('Error:', err.message);

  // UniqueConstraintError must be checked BEFORE ValidationError
  // because UniqueConstraintError extends ValidationError
  if (err instanceof UniqueConstraintError) {
    res.status(409).json({
      error: 'Conflict',
      message: 'Resource already exists',
      details: err.errors.map((e) => e.message),
    });
    return;
  }

  // Sequelize Validation Error
  if (err instanceof SequelizeValidationError) {
    res.status(400).json({
      error: 'Validation Error',
      message: err.errors.map((e) => e.message),
    });
    return;
  }

  // Sequelize Foreign Key Constraint Error
  if (err instanceof ForeignKeyConstraintError) {
    res.status(400).json({
      error: 'Foreign Key Constraint Error',
      message: 'Referenced resource does not exist',
    });
    return;
  }

  // Sequelize Database Error
  if (err instanceof DatabaseError) {
    res.status(500).json({
      error: 'Database Error',
      message: 'A database error occurred',
      ...(process.env.NODE_ENV === 'development' && { details: err.message }),
    });
    return;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Token expired',
    });
    return;
  }

  // Default error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
