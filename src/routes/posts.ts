import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { postValidators } from '../middleware/validators';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/posts
 * Get all posts for authenticated user (paginated)
 */
router.get('/', postValidators.getAll, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 6
  res.status(501).json({ message: 'Not implemented - Coming in Phase 6' });
});

/**
 * GET /api/posts/:id
 * Get a specific post by ID
 */
router.get('/:id', postValidators.getOne, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 6
  res.status(501).json({ message: 'Not implemented - Coming in Phase 6' });
});

/**
 * DELETE /api/posts/:id
 * Delete a post
 */
router.delete('/:id', postValidators.delete, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 6
  res.status(501).json({ message: 'Not implemented - Coming in Phase 6' });
});

export default router;
