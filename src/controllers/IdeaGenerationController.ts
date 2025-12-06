import { Request, Response, NextFunction } from 'express';
import {
  ideaGenerationService,
  InsufficientContextError,
  NoResourcesError,
  IdeaParsingError,
} from '../services/IdeaGenerationService';
import { RateLimitError, LLMServiceError } from '../services/LLMService';
import { PostIdea } from '../models';

/**
 * POST /api/ideas/generate
 * Generate post ideas based on context
 */
export const generateIdeas = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      profileId,
      projectId,
      platformId,
      auto,
      customContext,
      count,
      excludeRecentTopics,
    } = req.body;

    const result = await ideaGenerationService.generateIdeas({
      userId,
      profileId,
      projectId,
      platformId,
      auto: auto === true,
      customContext,
      count: count || 10,
      excludeRecentTopics: excludeRecentTopics !== false,
    });

    res.status(201).json({
      message: 'Ideas generated successfully',
      data: {
        ideas: result.ideas.map((idea) => ({
          id: idea.id,
          title: idea.title,
          description: idea.description,
          suggestedGoal: idea.suggestedGoal,
          relevanceScore: idea.relevanceScore,
          tags: idea.tags,
          createdAt: idea.createdAt,
        })),
        context: result.context,
        usage: result.usage,
      },
    });
  } catch (error) {
    // Handle custom errors
    if (error instanceof InsufficientContextError) {
      res.status(400).json({
        error: 'Validation Error',
        message: error.message,
        suggestion:
          'Provide at least one of: profileId, projectId, platformId, or set auto: true',
      });
      return;
    }

    if (error instanceof NoResourcesError) {
      res.status(400).json({
        error: 'No Resources',
        message: error.message,
        suggestion:
          'Create at least one profile, project, or platform before generating ideas',
      });
      return;
    }

    if (error instanceof IdeaParsingError) {
      res.status(500).json({
        error: 'Generation Error',
        message: 'Failed to parse generated ideas. Please try again.',
        code: 'PARSING_ERROR',
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

    next(error);
  }
};

/**
 * GET /api/ideas
 * List user's saved ideas with filters and pagination
 */
export const listIdeas = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      profileId,
      projectId,
      platformId,
      isUsed,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;

    const { ideas, total } = await ideaGenerationService.getIdeas(userId, {
      profileId: profileId as string | undefined,
      projectId: projectId as string | undefined,
      platformId: platformId as string | undefined,
      isUsed: isUsed === 'true' ? true : isUsed === 'false' ? false : undefined,
      limit: limitNum,
      offset,
    });

    res.status(200).json({
      data: ideas.map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        suggestedGoal: idea.suggestedGoal,
        relevanceScore: idea.relevanceScore,
        tags: idea.tags,
        isUsed: idea.isUsed,
        usedAt: idea.usedAt,
        profile: idea.profile ? { id: idea.profile.id, name: idea.profile.name } : null,
        project: idea.project ? { id: idea.project.id, name: idea.project.name } : null,
        platform: idea.platform
          ? { id: idea.platform.id, name: idea.platform.name }
          : null,
        createdAt: idea.createdAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/ideas/:id
 * Get a single idea by ID
 */
export const getIdeaById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const idea = await ideaGenerationService.getIdeaById(id, userId);

    if (!idea) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Idea not found',
      });
      return;
    }

    res.status(200).json({
      data: {
        id: idea.id,
        title: idea.title,
        description: idea.description,
        suggestedGoal: idea.suggestedGoal,
        relevanceScore: idea.relevanceScore,
        tags: idea.tags,
        isUsed: idea.isUsed,
        usedAt: idea.usedAt,
        postId: idea.postId,
        generationContext: idea.generationContext,
        profile: idea.profile ? { id: idea.profile.id, name: idea.profile.name } : null,
        project: idea.project ? { id: idea.project.id, name: idea.project.name } : null,
        platform: idea.platform
          ? { id: idea.platform.id, name: idea.platform.name }
          : null,
        createdAt: idea.createdAt,
        updatedAt: idea.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/ideas/:id/use
 * Mark an idea as used
 */
export const useIdea = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { postId } = req.body;

    const idea = await ideaGenerationService.markAsUsed(id, userId, postId);

    if (!idea) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Idea not found',
      });
      return;
    }

    res.status(200).json({
      message: 'Idea marked as used',
      data: {
        id: idea.id,
        title: idea.title,
        isUsed: idea.isUsed,
        usedAt: idea.usedAt,
        postId: idea.postId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ideas/:id
 * Delete an idea
 */
export const deleteIdea = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const deleted = await ideaGenerationService.deleteIdea(id, userId);

    if (!deleted) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Idea not found',
      });
      return;
    }

    res.status(200).json({
      message: 'Idea deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/ideas
 * Delete multiple ideas (bulk delete)
 */
export const bulkDeleteIdeas = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'ids must be a non-empty array of UUIDs',
      });
      return;
    }

    const deleted = await PostIdea.destroy({
      where: {
        id: ids,
        userId,
      },
    });

    res.status(200).json({
      message: `${deleted} idea(s) deleted successfully`,
      deletedCount: deleted,
    });
  } catch (error) {
    next(error);
  }
};
