import { Router, Request, Response } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { generateValidators } from '../middleware/validators';

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
 */
router.post('/', generateValidators.generate, (_req: Request, res: Response) => {
  // TODO: Implement in Phase 5
  res.status(501).json({ message: 'Not implemented - Coming in Phase 5' });
});

export default router;
