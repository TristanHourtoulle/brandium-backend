import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { generateValidators } from '../middleware/validators';
import * as GenerateController from '../controllers/GenerateController';
import * as HookGenerationController from '../controllers/HookGenerationController';

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

/**
 * POST /api/generate/hooks
 * Generate hook suggestions for a LinkedIn post
 *
 * Supports two modes:
 *
 * Mode 1 - From raw idea (legacy):
 * - rawIdea (required): The raw idea for the post
 * - count (optional): Number of hooks to generate (1-10, default: 4)
 *
 * Mode 2 - From existing post (NEW):
 * - postId (required): UUID of an existing post
 * - variants (optional): Number of variants per hook type (1-3, default: 2)
 *
 * Common parameters:
 * - goal (optional): Goal of the post/hooks
 * - profileId (optional): UUID of the profile to use for context
 *
 * Response:
 * - hooks: Array of hook suggestions with type, text, and engagement score
 * - totalHooks: Number of hooks generated
 * - source: Either 'post' or 'rawIdea'
 *
 * Example (from post):
 * ```json
 * {
 *   "postId": "uuid-here",
 *   "variants": 3,
 *   "profileId": "uuid-here"
 * }
 * ```
 * Returns 6-9 hooks with auto-detected optimal types, sorted by engagement
 */
router.post('/hooks', generateValidators.generateHooks, HookGenerationController.generateHooks);

/**
 * POST /api/generate/from-template
 * Generate a post from a template
 *
 * Request body:
 * - templateId (required): UUID of the template
 * - variables (required): Object with variable values
 * - profileId (optional): UUID of the profile to use for context
 * - platformId (optional): UUID of the platform
 * - goal (optional): Goal of the post
 *
 * Response:
 * - Post data with template information
 */
router.post('/from-template', generateValidators.generateFromTemplate, GenerateController.generateFromTemplate);

export default router;
