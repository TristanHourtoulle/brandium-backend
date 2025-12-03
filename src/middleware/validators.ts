import { body, param, query, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware to check validation results
 * Use after validation chains
 */
export const validate = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation Error',
      details: errors.array(),
    });
    return;
  }
  next();
};

// =====================================
// Auth Validators
// =====================================
export const authValidators = {
  register: [
    body('email')
      .isEmail()
      .withMessage('Email must be valid')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage(
        'Password must contain at least one uppercase, one lowercase, and one number',
      ),
    validate,
  ] as (ValidationChain | typeof validate)[],

  login: [
    body('email')
      .isEmail()
      .withMessage('Email must be valid')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Profile Validators
// =====================================
export const profileValidators = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name is required and must be less than 255 characters'),
    body('bio')
      .optional()
      .trim(),
    body('toneTags')
      .optional()
      .isArray()
      .withMessage('toneTags must be an array'),
    body('doRules')
      .optional()
      .isArray()
      .withMessage('doRules must be an array'),
    body('dontRules')
      .optional()
      .isArray()
      .withMessage('dontRules must be an array'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be less than 255 characters'),
    body('bio')
      .optional()
      .trim(),
    body('toneTags')
      .optional()
      .isArray()
      .withMessage('toneTags must be an array'),
    body('doRules')
      .optional()
      .isArray()
      .withMessage('doRules must be an array'),
    body('dontRules')
      .optional()
      .isArray()
      .withMessage('dontRules must be an array'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getOne: [
    param('id')
      .isUUID()
      .withMessage('Invalid profile ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  delete: [
    param('id')
      .isUUID()
      .withMessage('Invalid profile ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Project Validators
// =====================================
export const projectValidators = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name is required and must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('audience')
      .optional()
      .trim(),
    body('keyMessages')
      .optional()
      .isArray()
      .withMessage('keyMessages must be an array'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid project ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('audience')
      .optional()
      .trim(),
    body('keyMessages')
      .optional()
      .isArray()
      .withMessage('keyMessages must be an array'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getOne: [
    param('id')
      .isUUID()
      .withMessage('Invalid project ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  delete: [
    param('id')
      .isUUID()
      .withMessage('Invalid project ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Platform Validators
// =====================================
export const platformValidators = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name is required and must be less than 100 characters'),
    body('styleGuidelines')
      .optional()
      .trim(),
    body('maxLength')
      .optional()
      .isInt({ min: 1 })
      .withMessage('maxLength must be a positive integer'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid platform ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('styleGuidelines')
      .optional()
      .trim(),
    body('maxLength')
      .optional()
      .isInt({ min: 1 })
      .withMessage('maxLength must be a positive integer'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getOne: [
    param('id')
      .isUUID()
      .withMessage('Invalid platform ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  delete: [
    param('id')
      .isUUID()
      .withMessage('Invalid platform ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Generate Validators
// =====================================
export const generateValidators = {
  generate: [
    body('profileId')
      .optional()
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('projectId')
      .optional()
      .isUUID()
      .withMessage('Invalid project ID'),
    body('platformId')
      .optional()
      .isUUID()
      .withMessage('Invalid platform ID'),
    body('goal')
      .optional()
      .trim(),
    body('rawIdea')
      .trim()
      .isLength({ min: 1 })
      .withMessage('rawIdea is required'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Post Validators
// =====================================
export const postValidators = {
  getAll: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getOne: [
    param('id')
      .isUUID()
      .withMessage('Invalid post ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  delete: [
    param('id')
      .isUUID()
      .withMessage('Invalid post ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Common Validators (reusable)
// =====================================
export const commonValidators = {
  uuidParam: (paramName: string) => [
    param(paramName)
      .isUUID()
      .withMessage(`Invalid ${paramName} format`),
    validate,
  ] as (ValidationChain | typeof validate)[],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};
