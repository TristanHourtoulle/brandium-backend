import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { generateValidators } from '../middleware/validators';
import * as GenerateController from '../controllers/GenerateController';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/generate
 * Generate a post using OpenAI
 *
 * Request body:
 * - profileId (optional): UUID of the profile to use
 * - projectId (optional): UUID of the project to use
 * - platformId (optional): UUID of the platform to target
 * - goal (optional): Goal of the post
 * - rawIdea (required): The raw idea to transform into a post
 *
 * Response:
 * - generatedText: The AI-generated post content
 * - postId: The ID of the saved post
 * - usage: Token usage statistics
 */
router.post('/', generateValidators.generate, GenerateController.generate);

/**
 * GET /api/generate/status
 * Get rate limit status for the generation service
 *
 * Response:
 * - rateLimit: { requestsRemaining, tokensRemaining, windowResetIn }
 * - service: operational status
 */
router.get('/status', GenerateController.getStatus);

export default router;
