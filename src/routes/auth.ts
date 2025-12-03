import { Router } from 'express';
import { register, login, getMe } from '../controllers/AuthController';
import { authValidators } from '../middleware/validators';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', authValidators.register, register);

/**
 * POST /api/auth/login
 * Login user and return JWT
 */
router.post('/login', authValidators.login, login);

/**
 * GET /api/auth/me
 * Get current authenticated user (protected route)
 */
router.get('/me', authMiddleware, getMe);

export default router;
