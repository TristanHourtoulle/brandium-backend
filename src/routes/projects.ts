import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { projectValidators } from '../middleware/validators';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/projects
 * Get all projects for authenticated user
 */
router.get('/', (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
router.get('/:id', projectValidators.getOne, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * POST /api/projects
 * Create a new project
 */
router.post('/', projectValidators.create, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * PUT /api/projects/:id
 * Update a project
 */
router.put('/:id', projectValidators.update, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
router.delete('/:id', projectValidators.delete, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 4
  res.status(501).json({ message: 'Not implemented - Coming in Phase 4' });
});

export default router;
