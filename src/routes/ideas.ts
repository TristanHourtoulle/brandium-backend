import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { ideaValidators } from '../middleware/validators';
import * as IdeaController from '../controllers/IdeaGenerationController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/ideas/generate
 * Generate post ideas based on context
 *
 * Request body:
 * - profileId (optional): UUID of the profile to use for context
 * - projectId (optional): UUID of the project to use for context
 * - platformId (optional): UUID of the platform to target
 * - auto (optional): If true, automatically select context from user's resources
 * - customContext (optional): Additional context string (max 2000 chars)
 * - count (optional): Number of ideas to generate (1-20, default: 10)
 * - excludeRecentTopics (optional): Avoid topics from recent posts (default: true)
 *
 * Response:
 * - ideas: Array of generated ideas with id, title, description, etc.
 * - context: Information about what context was used
 * - usage: Token usage statistics
 */
router.post('/generate', ideaValidators.generate, IdeaController.generateIdeas);

/**
 * GET /api/ideas
 * List user's saved ideas with filters and pagination
 *
 * Query parameters:
 * - profileId (optional): Filter by profile
 * - projectId (optional): Filter by project
 * - platformId (optional): Filter by platform
 * - isUsed (optional): Filter by usage status (true/false)
 * - page (optional): Page number (default: 1)
 * - limit (optional): Items per page (1-100, default: 20)
 *
 * Response:
 * - data: Array of ideas
 * - pagination: { page, limit, total, totalPages }
 */
router.get('/', ideaValidators.list, IdeaController.listIdeas);

/**
 * GET /api/ideas/:id
 * Get a single idea by ID
 *
 * Response:
 * - data: Full idea object with all details
 */
router.get('/:id', ideaValidators.getById, IdeaController.getIdeaById);

/**
 * POST /api/ideas/:id/use
 * Mark an idea as used
 *
 * Request body:
 * - postId (optional): UUID of the post created from this idea
 *
 * Response:
 * - data: Updated idea with isUsed, usedAt, and postId
 */
router.post('/:id/use', ideaValidators.use, IdeaController.useIdea);

/**
 * DELETE /api/ideas/:id
 * Delete a single idea
 *
 * Response:
 * - message: Confirmation message
 */
router.delete('/:id', ideaValidators.delete, IdeaController.deleteIdea);

/**
 * DELETE /api/ideas
 * Bulk delete multiple ideas
 *
 * Request body:
 * - ids: Array of UUIDs to delete (1-100 items)
 *
 * Response:
 * - message: Confirmation message
 * - deletedCount: Number of ideas deleted
 */
router.delete('/', ideaValidators.bulkDelete, IdeaController.bulkDeleteIdeas);

export default router;
