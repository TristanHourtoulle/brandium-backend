import { Router } from 'express';
import { body, param } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware';
import { validate } from '../middleware/validators';
import * as PostIterationController from '../controllers/PostIterationController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * Validators for post iteration routes
 */
const iterationValidators = {
  iterate: [
    param('postId').isUUID().withMessage('Invalid post ID format'),
    body('iterationPrompt')
      .trim()
      .notEmpty()
      .withMessage('iterationPrompt is required')
      .isLength({ min: 3, max: 2000 })
      .withMessage('iterationPrompt must be between 3 and 2000 characters'),
    body('maxTokens')
      .optional()
      .isInt({ min: 50, max: 4000 })
      .withMessage('maxTokens must be between 50 and 4000'),
    validate,
  ],
  getVersions: [
    param('postId').isUUID().withMessage('Invalid post ID format'),
    validate,
  ],
  selectVersion: [
    param('postId').isUUID().withMessage('Invalid post ID format'),
    param('versionId').isUUID().withMessage('Invalid version ID format'),
    validate,
  ],
  getVersion: [
    param('postId').isUUID().withMessage('Invalid post ID format'),
    param('versionId').isUUID().withMessage('Invalid version ID format'),
    validate,
  ],
};

/**
 * POST /api/posts/:postId/iterate
 * Create a new iteration of an existing post
 *
 * @body {string} iterationPrompt - Instructions for modifying the post
 * @body {number} [maxTokens] - Optional max tokens for generation (50-4000)
 */
router.post('/:postId/iterate', iterationValidators.iterate, PostIterationController.iterate);

/**
 * GET /api/posts/:postId/versions
 * Get all versions of a post
 */
router.get('/:postId/versions', iterationValidators.getVersions, PostIterationController.getVersions);

/**
 * GET /api/posts/:postId/versions/:versionId
 * Get a specific version by ID
 */
router.get(
  '/:postId/versions/:versionId',
  iterationValidators.getVersion,
  PostIterationController.getVersion,
);

/**
 * PATCH /api/posts/:postId/versions/:versionId/select
 * Select a specific version as the current one
 */
router.patch(
  '/:postId/versions/:versionId/select',
  iterationValidators.selectVersion,
  PostIterationController.selectVersion,
);

export default router;
