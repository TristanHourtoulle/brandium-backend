import { Request, Response, NextFunction } from 'express';
import { Profile } from '../models';
import { findUserResource, sendNotFound, sendSuccess } from '../utils/controllerHelpers';
import {
  ProfileAnalysisService,
  ProfileAnalysisError,
} from '../services/ProfileAnalysisService';
import { RateLimitError } from '../services/LLMService';

// Lazy initialization to avoid creating LLMService at module load time (breaks tests)
let _profileAnalysisService: ProfileAnalysisService | null = null;
const getProfileAnalysisService = (): ProfileAnalysisService => {
  if (!_profileAnalysisService) {
    _profileAnalysisService = new ProfileAnalysisService();
  }
  return _profileAnalysisService;
};

/**
 * POST /api/profiles/:id/analyze-from-posts
 * Analyze historical posts to generate profile suggestions
 */
export const analyzeFromPosts = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const autoApply = req.query.autoApply === 'true';
    const platformId = req.query.platformId as string | undefined;
    const maxPosts = parseInt(req.query.maxPosts as string) || 25;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, id, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    // Perform analysis
    const result = await getProfileAnalysisService().analyzePostsForProfile(profile, {
      autoApply,
      platformId,
      maxPosts: Math.min(maxPosts, 50), // Cap at 50 posts
    });

    res.status(200).json({
      message: autoApply
        ? 'Analysis complete and applied to profile'
        : 'Analysis complete - suggestions ready for review',
      data: {
        totalPostsAnalyzed: result.totalPostsAnalyzed,
        suggestions: {
          toneTags: result.analysis.toneTags,
          doRules: result.analysis.doRules,
          dontRules: result.analysis.dontRules,
          styleInsights: result.analysis.styleInsights,
        },
        confidence: result.analysis.confidence,
        applied: result.applied,
        profile: result.applied ? result.updatedProfile : undefined,
      },
    });
  } catch (error) {
    // Handle specific errors
    if (error instanceof ProfileAnalysisError) {
      if (error.code === 'INSUFFICIENT_POSTS') {
        res.status(400).json({
          error: 'Insufficient Data',
          message: error.message,
          code: error.code,
        });
        return;
      }
      if (error.code === 'PARSE_ERROR') {
        res.status(500).json({
          error: 'Analysis Error',
          message: 'Failed to parse AI response. Please try again.',
          code: error.code,
        });
        return;
      }
      res.status(500).json({
        error: 'Analysis Error',
        message: error.message,
        code: error.code,
      });
      return;
    }

    if (error instanceof RateLimitError) {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: error.message,
        retryAfter: error.retryAfter,
      });
      return;
    }

    next(error);
  }
};

/**
 * GET /api/profiles/:id/analysis-stats
 * Get statistics about available data for analysis
 */
export const getAnalysisStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, id, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    const stats = await getProfileAnalysisService().getAnalysisStats(profile.id, req.user!.id);

    sendSuccess(res, {
      profileId: id,
      ...stats,
      readyForAnalysis: stats.hasEnoughPosts,
      message: stats.hasEnoughPosts
        ? 'Profile has enough historical posts for analysis'
        : `Need at least ${stats.minimumRequired} posts for analysis. Currently have ${stats.totalPosts}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profiles/:id/apply-analysis
 * Apply previously generated analysis to a profile
 */
export const applyAnalysis = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { toneTags, doRules, dontRules } = req.body;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, id, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    // Validate that at least one field is provided
    if (!toneTags && !doRules && !dontRules) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'At least one of toneTags, doRules, or dontRules must be provided',
      });
      return;
    }

    // Build update object
    const updates: Partial<{
      toneTags: string[];
      doRules: string[];
      dontRules: string[];
    }> = {};

    if (toneTags !== undefined) {
      updates.toneTags = Array.isArray(toneTags) ? toneTags : [];
    }
    if (doRules !== undefined) {
      updates.doRules = Array.isArray(doRules) ? doRules : [];
    }
    if (dontRules !== undefined) {
      updates.dontRules = Array.isArray(dontRules) ? dontRules : [];
    }

    await profile.update(updates);

    res.status(200).json({
      message: 'Analysis applied to profile successfully',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};
