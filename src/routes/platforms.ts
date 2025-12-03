import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { platformValidators } from '../middleware/validators';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/platforms
 * Get all platforms for authenticated user
 */
router.get('/', (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * GET /api/platforms/:id
 * Get a specific platform by ID
 */
router.get('/:id', platformValidators.getOne, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * POST /api/platforms
 * Create a new platform
 */
router.post('/', platformValidators.create, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * PUT /api/platforms/:id
 * Update a platform
 */
router.put('/:id', platformValidators.update, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * DELETE /api/platforms/:id
 * Delete a platform
 */
router.delete('/:id', platformValidators.delete, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

export default router;
