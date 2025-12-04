import { Request, Response, NextFunction } from 'express';
import { Profile } from '../models';
import {
  findUserResource,
  sendNotFound,
  sendSuccess,
  sendSuccessWithMessage,
  sendList,
} from '../utils/controllerHelpers';

/**
 * GET /api/profiles
 * Get all profiles for authenticated user
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const profiles = await Profile.findAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
    });

    sendList(res, profiles);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/profiles/:id
 * Get a specific profile by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const profile = await findUserResource(Profile, id, req.user!.id);

    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profiles
 * Create a new profile
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, bio, toneTags, doRules, dontRules } = req.body;

    const profile = await Profile.create({
      name,
      bio,
      toneTags,
      doRules,
      dontRules,
      userId: req.user!.id,
    });

    sendSuccessWithMessage(res, 'Profile created successfully', profile, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/profiles/:id
 * Update an existing profile
 */
export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const profile = await findUserResource(Profile, id, req.user!.id);

    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    const { name, bio, toneTags, doRules, dontRules } = req.body;

    // Build update object - only include fields that were provided
    const updates: Partial<{
      name: string;
      bio: string | null;
      toneTags: string[];
      doRules: string[];
      dontRules: string[];
    }> = {};

    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (toneTags !== undefined) updates.toneTags = toneTags;
    if (doRules !== undefined) updates.doRules = doRules;
    if (dontRules !== undefined) updates.dontRules = dontRules;

    await profile.update(updates);

    sendSuccessWithMessage(res, 'Profile updated successfully', profile);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/profiles/:id
 * Delete a profile
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const profile = await findUserResource(Profile, id, req.user!.id);

    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    await profile.destroy();

    res.status(200).json({
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
