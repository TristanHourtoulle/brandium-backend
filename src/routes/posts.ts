import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { postValidators } from '../middleware/validators';
import * as PostController from '../controllers/PostController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/posts
 * Get all posts for authenticated user (paginated)
 */
router.get('/', postValidators.getAll, PostController.getAll);

/**
 * GET /api/posts/:id
 * Get a specific post by ID
 */
router.get('/:id', postValidators.getOne, PostController.getById);

/**
 * DELETE /api/posts/:id
 * Delete a post
 */
router.delete('/:id', postValidators.delete, PostController.remove);

export default router;
