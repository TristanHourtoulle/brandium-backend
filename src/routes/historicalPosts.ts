import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { historicalPostValidators } from '../middleware/validators';
import * as HistoricalPostController from '../controllers/HistoricalPostController';

const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/profiles/:profileId/historical-posts
 * Create a new historical post for a profile
 */
router.post('/', historicalPostValidators.create, HistoricalPostController.create);

/**
 * GET /api/profiles/:profileId/historical-posts
 * Get all historical posts for a profile (paginated)
 */
router.get('/', historicalPostValidators.getAll, HistoricalPostController.getAll);

/**
 * GET /api/profiles/:profileId/historical-posts/stats
 * Get statistics for historical posts of a profile
 * Note: This route must be before /:id to avoid conflict
 */
router.get('/stats', historicalPostValidators.getStats, HistoricalPostController.getStats);

/**
 * POST /api/profiles/:profileId/historical-posts/bulk
 * Bulk create historical posts for a profile
 * Note: This route must be before /:id to avoid conflict
 */
router.post('/bulk', historicalPostValidators.bulkCreate, HistoricalPostController.bulkCreate);

/**
 * GET /api/profiles/:profileId/historical-posts/:id
 * Get a specific historical post by ID
 */
router.get('/:id', historicalPostValidators.getOne, HistoricalPostController.getById);

/**
 * PUT /api/profiles/:profileId/historical-posts/:id
 * PATCH /api/profiles/:profileId/historical-posts/:id
 * Update a historical post
 */
router.put('/:id', historicalPostValidators.update, HistoricalPostController.update);
router.patch('/:id', historicalPostValidators.update, HistoricalPostController.update);

/**
 * DELETE /api/profiles/:profileId/historical-posts/:id
 * Delete a historical post
 */
router.delete('/:id', historicalPostValidators.delete, HistoricalPostController.remove);

export default router;
