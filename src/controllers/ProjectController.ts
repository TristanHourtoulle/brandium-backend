import { Request, Response, NextFunction } from 'express';
import { Project } from '../models';
import {
  findUserResource,
  sendNotFound,
  sendSuccess,
  sendSuccessWithMessage,
  sendList,
} from '../utils/controllerHelpers';

/**
 * GET /api/projects
 * Get all projects for authenticated user
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const projects = await Project.findAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
    });

    sendList(res, projects);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/projects/:id
 * Get a specific project by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await findUserResource(Project, id, req.user!.id);

    if (!project) {
      sendNotFound(res, 'Project');
      return;
    }

    sendSuccess(res, project);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/projects
 * Create a new project
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, description, audience, keyMessages } = req.body;

    const project = await Project.create({
      name,
      description,
      audience,
      keyMessages,
      userId: req.user!.id,
    });

    sendSuccessWithMessage(res, 'Project created successfully', project, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/projects/:id
 * Update an existing project
 */
export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await findUserResource(Project, id, req.user!.id);

    if (!project) {
      sendNotFound(res, 'Project');
      return;
    }

    const { name, description, audience, keyMessages } = req.body;

    // Build update object - only include fields that were provided
    const updates: Partial<{
      name: string;
      description: string | null;
      audience: string | null;
      keyMessages: string[];
    }> = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (audience !== undefined) updates.audience = audience;
    if (keyMessages !== undefined) updates.keyMessages = keyMessages;

    await project.update(updates);

    sendSuccessWithMessage(res, 'Project updated successfully', project);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/projects/:id
 * Delete a project
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await findUserResource(Project, id, req.user!.id);

    if (!project) {
      sendNotFound(res, 'Project');
      return;
    }

    await project.destroy();

    res.status(200).json({
      message: 'Project deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
