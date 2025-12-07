import { Request, Response, NextFunction } from 'express';
import { templateService } from '../services/TemplateService';

/**
 * POST /api/templates
 * Create a new template
 */
export const createTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId, platformId, name, description, category, content, variables, exampleVariables, tags, isPublic } = req.body;
    const userId = req.user!.id;

    const template = await templateService.createTemplate({
      userId,
      profileId,
      platformId,
      name,
      description,
      category,
      content,
      variables,
      exampleVariables,
      tags,
      isPublic,
    });

    res.status(201).json({
      message: 'Template created successfully',
      data: {
        template,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation failed')) {
      res.status(400).json({
        error: 'Validation Error',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * GET /api/templates/:id
 * Get template by ID
 */
export const getTemplateById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!id) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Template ID is required',
      });
      return;
    }

    const template = await templateService.getTemplateById(id, userId);

    if (!template) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Template not found or access denied',
      });
      return;
    }

    res.status(200).json({
      data: {
        template,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/templates
 * List templates with filters
 */
export const listTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { category, platformId, profileId, includeSystem, includePublic, page, limit } = req.query;

    const result = await templateService.listTemplates({
      userId,
      category: category as string | undefined,
      platformId: platformId as string | undefined,
      profileId: profileId as string | undefined,
      includeSystem: includeSystem === 'true' || includeSystem === undefined,
      includePublic: includePublic === 'true' || includePublic === undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({
      message: 'Templates retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/templates/:id
 * Update a template
 */
export const updateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name, description, category, content, variables, exampleVariables, tags, isPublic } = req.body;

    if (!id) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Template ID is required',
      });
      return;
    }

    const template = await templateService.updateTemplate(id, userId, {
      name,
      description,
      category,
      content,
      variables,
      exampleVariables,
      tags,
      isPublic,
    });

    if (!template) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Template not found or access denied',
      });
      return;
    }

    res.status(200).json({
      message: 'Template updated successfully',
      data: {
        template,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('validation failed')) {
      res.status(400).json({
        error: 'Validation Error',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

/**
 * DELETE /api/templates/:id
 * Delete a template
 */
export const deleteTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!id) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Template ID is required',
      });
      return;
    }

    const success = await templateService.deleteTemplate(id, userId);

    if (!success) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Template not found or access denied',
      });
      return;
    }

    res.status(200).json({
      message: 'Template deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/templates/:id/render
 * Render a template with variables
 */
export const renderTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { variables, profileId, platformId } = req.body;

    if (!id) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Template ID is required',
      });
      return;
    }

    const result = await templateService.renderTemplateById(
      {
        templateId: id,
        variables,
        profileId,
        platformId,
      },
      userId,
    );

    if (result.missingVariables.length > 0) {
      res.status(400).json({
        error: 'Missing Variables',
        message: 'Required variables are missing',
        missingVariables: result.missingVariables,
      });
      return;
    }

    res.status(200).json({
      message: 'Template rendered successfully',
      data: {
        content: result.content,
        warnings: result.warnings,
        template: {
          id: result.template.id,
          name: result.template.name,
          category: result.template.category,
        },
      },
    });
  } catch (error) {
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
 * POST /api/templates/:id/duplicate
 * Duplicate a template
 */
export const duplicateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { name } = req.body;

    if (!id) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Template ID is required',
      });
      return;
    }

    const duplicate = await templateService.duplicateTemplate(id, userId, name);

    res.status(201).json({
      message: 'Template duplicated successfully',
      data: {
        template: duplicate,
      },
    });
  } catch (error) {
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
 * GET /api/templates/suggestions
 * Get template suggestions based on category and context
 */
export const getSuggestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { category, platformId, limit } = req.query;

    const templates = await templateService.getSuggestions({
      userId,
      category: category as string | undefined,
      platformId: platformId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.status(200).json({
      message: 'Template suggestions retrieved successfully',
      data: {
        templates,
        total: templates.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/templates/find-similar
 * Find similar templates based on content
 */
export const findSimilar = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { content, limit } = req.body;

    if (!content || content.trim() === '') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'Content is required',
      });
      return;
    }

    const templates = await templateService.findSimilarTemplates(
      userId,
      content,
      limit || 5,
    );

    res.status(200).json({
      message: 'Similar templates found',
      data: {
        templates,
        total: templates.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/templates/statistics
 * Get template statistics for the user
 */
export const getStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const stats = await templateService.getStatistics(userId);

    res.status(200).json({
      message: 'Template statistics retrieved successfully',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
