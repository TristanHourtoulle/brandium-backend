import { Request, Response, NextFunction } from 'express';
import { postVersionService } from '../services/PostVersionService';
import { RateLimitError, LLMServiceError } from '../services/LLMService';

/**
 * POST /api/posts/:postId/iterate
 * Create a new iteration of an existing post
 */
export const iterate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const postId = req.params.postId as string;
    const { iterationPrompt, maxTokens } = req.body;
    const userId = req.user!.id;

    // Validate iteration prompt
    if (!iterationPrompt || iterationPrompt.trim() === '') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'iterationPrompt is required and cannot be empty',
      });
      return;
    }

    // Create new iteration
    const { version, usage } = await postVersionService.createIteration({
      postId,
      userId,
      iterationPrompt: iterationPrompt.trim(),
      maxTokens,
    });

    res.status(201).json({
      message: 'Iteration created successfully',
      data: {
        versionId: version.id,
        versionNumber: version.versionNumber,
        generatedText: version.generatedText,
        iterationPrompt: version.iterationPrompt,
        isSelected: version.isSelected,
        usage,
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

    // Handle not found errors
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    // Pass other errors to global error handler
    next(error);
  }
};

/**
 * GET /api/posts/:postId/versions
 * Get all versions of a post
 */
export const getVersions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const postId = req.params.postId as string;
    const userId = req.user!.id;

    const versions = await postVersionService.getPostVersions(postId, userId);

    res.status(200).json({
      message: 'Versions retrieved successfully',
      data: {
        postId,
        totalVersions: versions.length,
        versions,
      },
    });
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * PATCH /api/posts/:postId/versions/:versionId/select
 * Select a specific version as the current one
 */
export const selectVersion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const postId = req.params.postId as string;
    const versionId = req.params.versionId as string;
    const userId = req.user!.id;

    const version = await postVersionService.selectVersion(postId, versionId, userId);

    res.status(200).json({
      message: 'Version selected successfully',
      data: version,
    });
  } catch (error) {
    // Handle not found errors
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: error.message,
      });
      return;
    }

    next(error);
  }
};

/**
 * GET /api/posts/:postId/versions/:versionId
 * Get a specific version by ID
 */
export const getVersion = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const versionId = req.params.versionId as string;
    const userId = req.user!.id;

    const version = await postVersionService.getVersion(versionId, userId);

    if (!version) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Version not found',
      });
      return;
    }

    res.status(200).json({
      message: 'Version retrieved successfully',
      data: version,
    });
  } catch (error) {
    next(error);
  }
};
