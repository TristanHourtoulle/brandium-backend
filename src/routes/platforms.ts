import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { platformValidators } from '../middleware/validators';
import * as PlatformController from '../controllers/PlatformController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/platforms
 * Get all platforms for authenticated user
 */
router.get('/', PlatformController.getAll);

/**
 * GET /api/platforms/:id
 * Get a specific platform by ID
 */
router.get('/:id', platformValidators.getOne, PlatformController.getById);

/**
 * POST /api/platforms
 * Create a new platform
 */
router.post('/', platformValidators.create, PlatformController.create);

/**
 * PUT /api/platforms/:id
 * Update a platform
 */
router.put('/:id', platformValidators.update, PlatformController.update);

/**
 * DELETE /api/platforms/:id
 * Delete a platform
 */
router.delete('/:id', platformValidators.delete, PlatformController.remove);

export default router;
