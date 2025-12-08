import { Request, Response, NextFunction } from 'express';
import { hookGenerationService } from '../services/HookGenerationService';
import { Profile } from '../models/Profile';
import { RateLimitError, LLMServiceError } from '../services/LLMService';

/**
 * POST /api/generate/hooks
 * Generate hook suggestions for a LinkedIn post
 *
 * Supports two modes:
 * 1. From rawIdea: Generate 4 different hook types from a raw idea
 * 2. From postId: Analyze existing post and generate multiple variants
 */
export const generateHooks = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rawIdea, postId, goal, profileId, count, variants } = req.body;
    const userId = req.user!.id;

    // Validate that either rawIdea or postId is provided
    if (!rawIdea && !postId) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Either rawIdea or postId is required',
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

    // Validate variants if provided
    if (variants !== undefined && (variants < 1 || variants > 3)) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'variants must be between 1 and 3',
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

    let hooks;

    // Generate hooks based on postId or rawIdea
    if (postId) {
      // Import Post model here to avoid circular dependency
      const { Post } = await import('../models');

      // Fetch the post
      const post = await Post.findOne({
        where: { id: postId, userId },
      });

      if (!post) {
        res.status(404).json({
          error: 'Not Found',
          message: 'Post not found or access denied',
        });
        return;
      }

      // If no profile specified, try to use post's profile
      if (!profile && post.profileId) {
        profile = await Profile.findOne({
          where: { id: post.profileId, userId },
        });
      }

      // Generate hooks from post content
      hooks = await hookGenerationService.generateHooksFromPost({
        postContent: post.generatedText,
        goal: goal?.trim() || post.goal || undefined,
        profile: profile
          ? {
              name: profile.name,
              bio: profile.bio || undefined,
              toneTags: profile.toneTags,
            }
          : undefined,
        variants: variants || 2,
      });
    } else {
      // Generate hooks from raw idea (legacy behavior)
      hooks = await hookGenerationService.generateHooks({
        rawIdea: rawIdea!.trim(),
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
    }

    res.status(200).json({
      message: 'Hooks generated successfully',
      data: {
        hooks,
        totalHooks: hooks.length,
        source: postId ? 'post' : 'rawIdea',
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
