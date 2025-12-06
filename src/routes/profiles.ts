import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { profileValidators, profileAnalysisValidators } from '../middleware/validators';
import * as ProfileController from '../controllers/ProfileController';
import * as ProfileAnalysisController from '../controllers/ProfileAnalysisController';

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

// =====================================
// Profile Analysis Routes
// =====================================

/**
 * POST /api/profiles/:id/analyze-from-posts
 * Analyze historical posts to generate profile suggestions
 * Query params: autoApply=true/false, platformId=uuid, maxPosts=number
 */
router.post(
  '/:id/analyze-from-posts',
  profileAnalysisValidators.analyzeFromPosts,
  ProfileAnalysisController.analyzeFromPosts,
);

/**
 * GET /api/profiles/:id/analysis-stats
 * Get statistics about available data for analysis
 */
router.get(
  '/:id/analysis-stats',
  profileAnalysisValidators.getStats,
  ProfileAnalysisController.getAnalysisStats,
);

/**
 * POST /api/profiles/:id/apply-analysis
 * Apply previously generated analysis to a profile
 */
router.post(
  '/:id/apply-analysis',
  profileAnalysisValidators.applyAnalysis,
  ProfileAnalysisController.applyAnalysis,
);

export default router;
