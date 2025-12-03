import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { profileValidators } from '../middleware/validators';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/profiles
 * Get all profiles for authenticated user
 */
router.get('/', (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * GET /api/profiles/:id
 * Get a specific profile by ID
 */
router.get('/:id', profileValidators.getOne, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * POST /api/profiles
 * Create a new profile
 */
router.post('/', profileValidators.create, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * PUT /api/profiles/:id
 * Update a profile
 */
router.put('/:id', profileValidators.update, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * DELETE /api/profiles/:id
 * Delete a profile
 */
router.delete('/:id', profileValidators.delete, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

export default router;
