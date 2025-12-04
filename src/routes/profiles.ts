import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { profileValidators } from '../middleware/validators';
import * as ProfileController from '../controllers/ProfileController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/profiles
 * Get all profiles for authenticated user
 */
router.get('/', ProfileController.getAll);

/**
 * GET /api/profiles/:id
 * Get a specific profile by ID
 */
router.get('/:id', profileValidators.getOne, ProfileController.getById);

/**
 * POST /api/profiles
 * Create a new profile
 */
router.post('/', profileValidators.create, ProfileController.create);

/**
 * PUT /api/profiles/:id
 * Update a profile
 */
router.put('/:id', profileValidators.update, ProfileController.update);

/**
 * DELETE /api/profiles/:id
 * Delete a profile
 */
router.delete('/:id', profileValidators.delete, ProfileController.remove);

export default router;
