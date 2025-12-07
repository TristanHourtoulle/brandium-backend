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
    body('variants')
      .optional()
      .isInt({ min: 1, max: 4 })
      .withMessage('variants must be between 1 and 4'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  generateHooks: [
    body('rawIdea')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('rawIdea is required and must be less than 1000 characters'),
    body('goal')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('goal must be less than 500 characters'),
    body('profileId')
      .optional()
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('count')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('count must be between 1 and 10'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  generateFromTemplate: [
    body('templateId')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('variables')
      .isObject()
      .withMessage('Variables must be an object'),
    body('profileId')
      .optional()
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('platformId')
      .optional()
      .isUUID()
      .withMessage('Invalid platform ID'),
    body('goal')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('goal must be less than 500 characters'),
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
// Historical Post Validators
// =====================================
export const historicalPostValidators = {
  create: [
    param('profileId')
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Content is required and must be less than 50000 characters'),
    body('platformId')
      .optional({ values: 'null' })
      .isUUID()
      .withMessage('Invalid platform ID'),
    body('publishedAt')
      .optional({ values: 'null' })
      .isISO8601()
      .withMessage('publishedAt must be a valid ISO 8601 date'),
    body('externalUrl')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('externalUrl must be a valid URL'),
    body('engagement')
      .optional()
      .isObject()
      .withMessage('engagement must be an object'),
    body('engagement.likes')
      .optional()
      .isInt({ min: 0 })
      .withMessage('engagement.likes must be a non-negative integer'),
    body('engagement.comments')
      .optional()
      .isInt({ min: 0 })
      .withMessage('engagement.comments must be a non-negative integer'),
    body('engagement.shares')
      .optional()
      .isInt({ min: 0 })
      .withMessage('engagement.shares must be a non-negative integer'),
    body('engagement.views')
      .optional()
      .isInt({ min: 0 })
      .withMessage('engagement.views must be a non-negative integer'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('metadata must be an object'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  update: [
    param('profileId')
      .isUUID()
      .withMessage('Invalid profile ID'),
    param('id')
      .isUUID()
      .withMessage('Invalid historical post ID'),
    body('content')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Content must be less than 50000 characters'),
    body('platformId')
      .optional({ values: 'null' })
      .isUUID()
      .withMessage('Invalid platform ID'),
    body('publishedAt')
      .optional({ values: 'null' })
      .isISO8601()
      .withMessage('publishedAt must be a valid ISO 8601 date'),
    body('externalUrl')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('externalUrl must be a valid URL'),
    body('engagement')
      .optional()
      .isObject()
      .withMessage('engagement must be an object'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('metadata must be an object'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getAll: [
    param('profileId')
      .isUUID()
      .withMessage('Invalid profile ID'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('platformId')
      .optional()
      .isUUID()
      .withMessage('Invalid platform ID filter'),
    query('sortBy')
      .optional()
      .isIn(['publishedAt', 'createdAt', 'updatedAt'])
      .withMessage('sortBy must be one of: publishedAt, createdAt, updatedAt'),
    query('order')
      .optional()
      .isIn(['ASC', 'DESC', 'asc', 'desc'])
      .withMessage('order must be ASC or DESC'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getOne: [
    param('profileId')
      .isUUID()
      .withMessage('Invalid profile ID'),
    param('id')
      .isUUID()
      .withMessage('Invalid historical post ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  delete: [
    param('profileId')
      .isUUID()
      .withMessage('Invalid profile ID'),
    param('id')
      .isUUID()
      .withMessage('Invalid historical post ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  bulkCreate: [
    param('profileId')
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('posts')
      .isArray({ min: 1, max: 100 })
      .withMessage('posts must be an array with 1-100 items'),
    body('posts.*.content')
      .trim()
      .isLength({ min: 1, max: 50000 })
      .withMessage('Each post content is required and must be less than 50000 characters'),
    body('posts.*.platformId')
      .optional({ values: 'null' })
      .isUUID()
      .withMessage('Invalid platform ID in posts'),
    body('posts.*.publishedAt')
      .optional({ values: 'null' })
      .isISO8601()
      .withMessage('publishedAt must be a valid ISO 8601 date'),
    body('posts.*.externalUrl')
      .optional({ values: 'null' })
      .isURL()
      .withMessage('externalUrl must be a valid URL'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getStats: [
    param('profileId')
      .isUUID()
      .withMessage('Invalid profile ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Profile Analysis Validators
// =====================================
export const profileAnalysisValidators = {
  analyzeFromPosts: [
    param('id')
      .isUUID()
      .withMessage('Invalid profile ID'),
    query('autoApply')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('autoApply must be true or false'),
    query('platformId')
      .optional()
      .isUUID()
      .withMessage('Invalid platform ID'),
    query('maxPosts')
      .optional()
      .isInt({ min: 5, max: 50 })
      .withMessage('maxPosts must be between 5 and 50'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getStats: [
    param('id')
      .isUUID()
      .withMessage('Invalid profile ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  applyAnalysis: [
    param('id')
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('toneTags')
      .optional()
      .isArray()
      .withMessage('toneTags must be an array'),
    body('toneTags.*')
      .optional()
      .isString()
      .withMessage('Each toneTag must be a string'),
    body('doRules')
      .optional()
      .isArray()
      .withMessage('doRules must be an array'),
    body('doRules.*')
      .optional()
      .isString()
      .withMessage('Each doRule must be a string'),
    body('dontRules')
      .optional()
      .isArray()
      .withMessage('dontRules must be an array'),
    body('dontRules.*')
      .optional()
      .isString()
      .withMessage('Each dontRule must be a string'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};

// =====================================
// Idea Generation Validators
// =====================================
export const ideaValidators = {
  generate: [
    body('profileId')
      .optional()
      .isUUID()
      .withMessage('profileId must be a valid UUID'),
    body('projectId')
      .optional()
      .isUUID()
      .withMessage('projectId must be a valid UUID'),
    body('platformId')
      .optional()
      .isUUID()
      .withMessage('platformId must be a valid UUID'),
    body('auto')
      .optional()
      .isBoolean()
      .withMessage('auto must be a boolean'),
    body('customContext')
      .optional()
      .isString()
      .isLength({ max: 2000 })
      .withMessage('customContext must be a string with max 2000 characters'),
    body('count')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('count must be an integer between 1 and 20'),
    body('excludeRecentTopics')
      .optional()
      .isBoolean()
      .withMessage('excludeRecentTopics must be a boolean'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  list: [
    query('profileId')
      .optional()
      .isUUID()
      .withMessage('profileId must be a valid UUID'),
    query('projectId')
      .optional()
      .isUUID()
      .withMessage('projectId must be a valid UUID'),
    query('platformId')
      .optional()
      .isUUID()
      .withMessage('platformId must be a valid UUID'),
    query('isUsed')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('isUsed must be true or false'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getById: [
    param('id')
      .isUUID()
      .withMessage('id must be a valid UUID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  use: [
    param('id')
      .isUUID()
      .withMessage('id must be a valid UUID'),
    body('postId')
      .optional()
      .isUUID()
      .withMessage('postId must be a valid UUID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  delete: [
    param('id')
      .isUUID()
      .withMessage('id must be a valid UUID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  bulkDelete: [
    body('ids')
      .isArray({ min: 1, max: 100 })
      .withMessage('ids must be an array with 1-100 items'),
    body('ids.*')
      .isUUID()
      .withMessage('Each id must be a valid UUID'),
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

// =====================================
// Template Validators
// =====================================
export const templateValidators = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name is required and must be less than 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category is required and must be less than 100 characters'),
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Content is required'),
    body('variables')
      .isArray()
      .withMessage('Variables must be an array'),
    body('variables.*.name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Variable name is required'),
    body('variables.*.description')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Variable description is required'),
    body('variables.*.required')
      .isBoolean()
      .withMessage('Variable required must be a boolean'),
    body('exampleVariables')
      .optional()
      .isObject()
      .withMessage('Example variables must be an object'),
    body('profileId')
      .optional()
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('platformId')
      .optional()
      .isUUID()
      .withMessage('Invalid platform ID'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  update: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be less than 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be less than 1000 characters'),
    body('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Category must be less than 100 characters'),
    body('content')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Content cannot be empty'),
    body('variables')
      .optional()
      .isArray()
      .withMessage('Variables must be an array'),
    body('exampleVariables')
      .optional()
      .isObject()
      .withMessage('Example variables must be an object'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  getById: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  deleteTemplate: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  list: [
    query('category')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Category must not be empty'),
    query('platformId')
      .optional()
      .isUUID()
      .withMessage('Invalid platform ID'),
    query('profileId')
      .optional()
      .isUUID()
      .withMessage('Invalid profile ID'),
    query('includeSystem')
      .optional()
      .isBoolean()
      .withMessage('includeSystem must be a boolean'),
    query('includePublic')
      .optional()
      .isBoolean()
      .withMessage('includePublic must be a boolean'),
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

  render: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('variables')
      .isObject()
      .withMessage('Variables must be an object'),
    body('profileId')
      .optional()
      .isUUID()
      .withMessage('Invalid profile ID'),
    body('platformId')
      .optional()
      .isUUID()
      .withMessage('Invalid platform ID'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  duplicate: [
    param('id')
      .isUUID()
      .withMessage('Invalid template ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Name must be less than 255 characters'),
    validate,
  ] as (ValidationChain | typeof validate)[],

  findSimilar: [
    body('content')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Content is required'),
    body('limit')
      .optional()
      .isInt({ min: 1, max: 20 })
      .withMessage('Limit must be between 1 and 20'),
    validate,
  ] as (ValidationChain | typeof validate)[],
};
