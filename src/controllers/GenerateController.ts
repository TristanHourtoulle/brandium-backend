import { Request, Response, NextFunction } from 'express';
import { Profile, Project, Platform, Post, HistoricalPost } from '../models';
import { sequelize } from '../config/database';
import { findUserResource } from '../utils/controllerHelpers';
import { buildPrompt, validatePromptContext } from '../utils/promptBuilder';
import { llmService, RateLimitError, LLMServiceError } from '../services/LLMService';
import { postVersionService } from '../services/PostVersionService';
import { selectPostsWithTokenBudget } from '../utils/historicalPostSelector';
import { isPlatformSupported } from '../config/constants';

/**
 * POST /api/generate
 * Generate a post using AI based on profile, project, and platform context
 */
export const generate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId, projectId, platformId, goal, rawIdea } = req.body;
    const userId = req.user!.id;

    // Fetch optional context entities (in parallel for performance)
    const [profile, project, platform] = await Promise.all([
      profileId ? findUserResource(Profile, profileId, userId) : null,
      projectId ? findUserResource(Project, projectId, userId) : null,
      platformId ? findUserResource(Platform, platformId, userId) : null,
    ]);

    // Validate that provided IDs exist and belong to user
    if (profileId && !profile) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Profile not found',
      });
      return;
    }

    if (projectId && !project) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Project not found',
      });
      return;
    }

    if (platformId && !platform) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Platform not found',
      });
      return;
    }

    // LinkedIn-only validation: reject unsupported platforms
    if (platform && !isPlatformSupported(platform.name)) {
      res.status(400).json({
        error: 'Platform Not Supported',
        message: `Generation is currently only supported for LinkedIn. Platform "${platform.name}" is not supported yet.`,
        supportedPlatforms: ['LinkedIn'],
      });
      return;
    }

    // Validate prompt context
    const validation = validatePromptContext({ rawIdea, goal, profile, project, platform });
    if (!validation.valid) {
      res.status(400).json({
        error: 'Validation Error',
        message: validation.error,
      });
      return;
    }

    // Fetch historical posts for writing style examples if profile is provided
    let historicalPosts: HistoricalPost[] = [];
    if (profile) {
      const allHistoricalPosts = await HistoricalPost.findAll({
        where: {
          profileId: profile.id,
          userId,
        },
        order: [
          ['publishedAt', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: 20, // Fetch more than needed for scoring
      });

      // Select the most relevant posts within token budget
      historicalPosts = selectPostsWithTokenBudget(allHistoricalPosts, {
        maxPosts: 5,
        platformId: platformId || null,
        includeFallback: true,
      });
    }

    // Build the prompt with historical posts context
    const prompt = buildPrompt({
      profile,
      project,
      platform,
      goal,
      rawIdea,
      historicalPosts,
    });

    // Generate content using LLM
    const result = await llmService.generate({ prompt });

    // Use transaction to ensure atomicity
    const transaction = await sequelize.transaction();

    try {
      // Save the generated post to database
      const post = await Post.create(
        {
          userId,
          profileId: profile?.id || null,
          projectId: project?.id || null,
          platformId: platform?.id || null,
          goal: goal || null,
          rawIdea,
          generatedText: result.text,
          totalVersions: 1,
        },
        { transaction },
      );

      // Create initial version
      const version = await postVersionService.createInitialVersion({
        postId: post.id,
        generatedText: result.text,
        usage: result.usage,
        transaction,
      });

      await transaction.commit();

      // Return success response
      res.status(201).json({
        message: 'Post generated successfully',
        data: {
          postId: post.id,
          versionId: version.id,
          versionNumber: 1,
          generatedText: result.text,
          usage: result.usage,
          context: {
            profile: profile ? { id: profile.id, name: profile.name } : null,
            project: project ? { id: project.id, name: project.name } : null,
            platform: platform ? { id: platform.id, name: platform.name } : null,
            historicalPostsUsed: historicalPosts.length,
          },
        },
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
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

/**
 * GET /api/generate/status
 * Get current rate limit status
 */
export const getStatus = async (
  _req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> => {
  const status = llmService.getRateLimitStatus();

  res.status(200).json({
    data: {
      rateLimit: status,
      service: 'operational',
    },
  });
};
