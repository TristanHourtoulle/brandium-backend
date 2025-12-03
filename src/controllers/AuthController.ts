import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';

// Default JWT expiration time in seconds (7 days)
const DEFAULT_JWT_EXPIRATION = 60 * 60 * 24 * 7;

/**
 * Parses JWT expiration from environment variable or returns default
 * Supports formats like '7d', '24h', '60m', '3600s', or pure number (seconds)
 */
const getJwtExpiration = (): number => {
  const envValue = process.env.JWT_EXPIRES_IN;
  if (!envValue) return DEFAULT_JWT_EXPIRATION;

  // If it's a pure number string, parse as seconds
  const numericValue = parseInt(envValue, 10);
  if (!isNaN(numericValue) && String(numericValue) === envValue) {
    return numericValue;
  }

  // Parse duration strings like '7d', '24h', '60m', '3600s'
  const match = envValue.match(/^(\d+)([smhd])$/);
  if (match && match[1] && match[2]) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
    }
  }

  return DEFAULT_JWT_EXPIRATION;
};

/**
 * Generates a JWT token for a user
 * @param userId - The user's UUID
 * @returns JWT token string
 */
const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign({ userId }, secret, {
    expiresIn: getJwtExpiration(),
  });
};

/**
 * POST /api/auth/register
 * Register a new user
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'User already exists with this email',
      });
      return;
    }

    // Create the user (password will be hashed by beforeCreate hook)
    const user = await User.create({
      email,
      passwordHash: password,
    });

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Login an existing user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(200).json({
      message: 'Login successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Get the currently authenticated user (protected route)
 */
export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated',
      });
      return;
    }

    res.status(200).json({
      user: req.user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};
