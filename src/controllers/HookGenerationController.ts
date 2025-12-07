import { Request, Response, NextFunction } from 'express';
import { hookGenerationService } from '../services/HookGenerationService';
import { Profile } from '../models/Profile';
import { RateLimitError, LLMServiceError } from '../services/LLMService';

/**
 * POST /api/generate/hooks
 * Generate hook suggestions for a LinkedIn post
 */
export const generateHooks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rawIdea, goal, profileId, count } = req.body;
    const userId = req.user!.id;

    // Validate required fields
    if (!rawIdea || rawIdea.trim() === '') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'rawIdea is required and cannot be empty',
      });
      return;
    }

    // Validate count if provided
    if (count !== undefined && (count < 1 || count > 10)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'count must be between 1 and 10',
      });
      return;
    }

    // Fetch profile if profileId is provided
    let profile: Profile | null = null;
    if (profileId) {
      profile = await Profile.findOne({
        where: { id: profileId, userId },
      });

      if (!profile) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Profile not found or access denied',
        });
        return;
      }
    }

    // Generate hooks
    const hooks = await hookGenerationService.generateHooks({
      rawIdea: rawIdea.trim(),
      goal: goal?.trim(),
      profile: profile
        ? {
            name: profile.name,
            bio: profile.bio || undefined,
            toneTags: profile.toneTags,
          }
        : undefined,
      count: count || 4,
    });

    res.status(200).json({
      message: 'Hooks generated successfully',
      data: {
        hooks,
        totalHooks: hooks.length,
      },
    });
  } catch (error) {
    // Handle rate limit errors
    if (error instanceof RateLimitError) {
      res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: error.message,
        retryAfter: error.retryAfter,
      });
      return;
    }

    // Handle LLM service errors
    if (error instanceof LLMServiceError) {
      const statusMap: Record<string, number> = {
        API_KEY_MISSING: 503,
        INVALID_API_KEY: 503,
        SERVICE_UNAVAILABLE: 503,
        EMPTY_RESPONSE: 500,
        API_ERROR: 502,
        GENERATION_FAILED: 500,
      };
      const status = statusMap[error.code] || 500;

      res.status(status).json({
        error: 'Generation Error',
        message: error.message,
        code: error.code,
      });
      return;
    }

    // Pass other errors to global error handler
    next(error);
  }
};
