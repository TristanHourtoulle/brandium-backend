import { Request, Response, NextFunction } from 'express';
import { Profile, Project, Platform, Post, HistoricalPost } from '../models';
import { sequelize } from '../config/database';
import { findUserResource } from '../utils/controllerHelpers';
import { buildPrompt, validatePromptContext } from '../utils/promptBuilder';
import { llmService, RateLimitError, LLMServiceError } from '../services/LLMService';
import { postVersionService } from '../services/PostVersionService';
import { selectPostsWithTokenBudget } from '../utils/historicalPostSelector';
import { isPlatformSupported } from '../config/constants';
import { variantGenerationService } from '../services/VariantGenerationService';
import { templateService } from '../services/TemplateService';

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
    const { profileId, projectId, platformId, goal, rawIdea, variants = 1 } = req.body;
    const userId = req.user!.id;

    // Check if generating multiple variants (only if explicitly requested with variants >= 2)
    const generateMultipleVariants = variants >= 2;

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

    // Use transaction to ensure atomicity
    const transaction = await sequelize.transaction();

    try {
      // Generate multiple variants or single post based on request
      if (generateMultipleVariants) {
        // Generate multiple variants with different approaches
        const variantResults = await variantGenerationService.generateVariants(
          {
            profile,
            project,
            platform,
            goal,
            rawIdea,
            historicalPosts,
          },
          variants,
        );

        // Save each variant as a separate post
        const savedPosts = await Promise.all(
          variantResults.map(async (variant) => {
            const post = await Post.create(
              {
                userId,
                profileId: profile?.id || null,
                projectId: project?.id || null,
                platformId: platform?.id || null,
                goal: goal || null,
                rawIdea,
                generatedText: variant.text,
                totalVersions: 1,
              },
              { transaction },
            );

            const version = await postVersionService.createInitialVersion({
              postId: post.id,
              generatedText: variant.text,
              usage: variant.usage,
              transaction,
            });

            return {
              postId: post.id,
              versionId: version.id,
              versionNumber: 1,
              generatedText: variant.text,
              approach: variant.approach,
              format: variant.format,
              usage: variant.usage,
            };
          }),
        );

        await transaction.commit();

        // Return all variants
        res.status(201).json({
          message: `${variants} post variants generated successfully`,
          data: {
            variants: savedPosts,
            totalVariants: savedPosts.length,
            context: {
              profile: profile ? { id: profile.id, name: profile.name } : null,
              project: project ? { id: project.id, name: project.name } : null,
              platform: platform ? { id: platform.id, name: platform.name } : null,
              historicalPostsUsed: historicalPosts.length,
            },
          },
        });
      } else {
        // Single post generation (default behavior)
        const prompt = buildPrompt({
          profile,
          project,
          platform,
          goal,
          rawIdea,
          historicalPosts,
        });

        const result = await llmService.generate({ prompt });

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

        const version = await postVersionService.createInitialVersion({
          postId: post.id,
          generatedText: result.text,
          usage: result.usage,
          transaction,
        });

        await transaction.commit();

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
      }
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

/**
 * POST /api/generate/from-template
 * Generate a post from a template
 */
export const generateFromTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { templateId, variables, profileId, platformId, goal } = req.body;
    const userId = req.user!.id;

    // Render the template with variables
    const renderResult = await templateService.renderTemplateById(
      {
        templateId,
        variables,
        profileId,
        platformId,
      },
      userId,
    );

    if (renderResult.missingVariables.length > 0) {
      res.status(400).json({
        error: 'Missing Variables',
        message: 'Required template variables are missing',
        missingVariables: renderResult.missingVariables,
      });
      return;
    }

    // Use the rendered content as rawIdea for generation
    const rawIdea = renderResult.content;

    // Fetch optional context entities
    const [profile, platform] = await Promise.all([
      profileId ? findUserResource(Profile, profileId, userId) : null,
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

    if (platformId && !platform) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Platform not found',
      });
      return;
    }

    // LinkedIn-only validation
    if (platform && !isPlatformSupported(platform.name)) {
      res.status(400).json({
        error: 'Platform Not Supported',
        message: `Generation is currently only supported for LinkedIn. Platform "${platform.name}" is not supported yet.`,
        supportedPlatforms: ['LinkedIn'],
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
        limit: 20,
      });

      historicalPosts = selectPostsWithTokenBudget(allHistoricalPosts, {
        maxPosts: 5,
        platformId: platformId || null,
        includeFallback: true,
      });
    }

    // Build the prompt
    const prompt = buildPrompt({
      profile,
      project: null,
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
      // Save the generated post
      const post = await Post.create(
        {
          userId,
          profileId: profile?.id || null,
          projectId: null,
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
        message: 'Post generated from template successfully',
        data: {
          postId: post.id,
          versionId: version.id,
          versionNumber: 1,
          generatedText: result.text,
          usage: result.usage,
          template: {
            id: renderResult.template.id,
            name: renderResult.template.name,
            category: renderResult.template.category,
          },
          warnings: renderResult.warnings,
          context: {
            profile: profile ? { id: profile.id, name: profile.name } : null,
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
    // Handle template errors
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

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
