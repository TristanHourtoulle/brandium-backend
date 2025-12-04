import { Request, Response, NextFunction } from 'express';
import { Platform } from '../models';
import {
  findUserResource,
  sendNotFound,
  sendSuccess,
  sendSuccessWithMessage,
  sendList,
} from '../utils/controllerHelpers';

/**
 * GET /api/platforms
 * Get all platforms for authenticated user
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const platforms = await Platform.findAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
    });

    sendList(res, platforms);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/platforms/:id
 * Get a specific platform by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const platform = await findUserResource(Platform, id, req.user!.id);

    if (!platform) {
      sendNotFound(res, 'Platform');
      return;
    }

    sendSuccess(res, platform);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/platforms
 * Create a new platform
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, styleGuidelines, maxLength } = req.body;

    const platform = await Platform.create({
      name,
      styleGuidelines,
      maxLength,
      userId: req.user!.id,
    });

    sendSuccessWithMessage(res, 'Platform created successfully', platform, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/platforms/:id
 * Update an existing platform
 */
export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const platform = await findUserResource(Platform, id, req.user!.id);

    if (!platform) {
      sendNotFound(res, 'Platform');
      return;
    }

    const { name, styleGuidelines, maxLength } = req.body;

    // Build update object - only include fields that were provided
    const updates: Partial<{
      name: string;
      styleGuidelines: string | null;
      maxLength: number | null;
    }> = {};

    if (name !== undefined) updates.name = name;
    if (styleGuidelines !== undefined) updates.styleGuidelines = styleGuidelines;
    if (maxLength !== undefined) updates.maxLength = maxLength;

    await platform.update(updates);

    sendSuccessWithMessage(res, 'Platform updated successfully', platform);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/platforms/:id
 * Delete a platform
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const platform = await findUserResource(Platform, id, req.user!.id);

    if (!platform) {
      sendNotFound(res, 'Platform');
      return;
    }

    await platform.destroy();

    res.status(200).json({
      message: 'Platform deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
