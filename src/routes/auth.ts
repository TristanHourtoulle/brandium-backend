import { Router, Request, Response } from 'express';
import { authValidators } from '../middleware/validators';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authValidators.register, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 3
  res.status(501).json({ message: 'Not implemented - Coming in Phase 3' });
});

/**
 * POST /api/auth/login
 * Login user and return JWT
 */
router.post('/login', authValidators.login, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 3
  res.status(501).json({ message: 'Not implemented - Coming in Phase 3' });
});

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get('/me', (_req: Request, res: Response) => {
  // TODO: Implement in Phase 3 (requires authMiddleware)
  res.status(501).json({ message: 'Not implemented - Coming in Phase 3' });
});

export default router;
