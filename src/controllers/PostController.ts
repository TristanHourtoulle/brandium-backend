import { Request, Response, NextFunction } from 'express';
import { Post, Profile, Project, Platform } from '../models';
import { findUserResource, sendNotFound, sendSuccess } from '../utils/controllerHelpers';

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

/**
 * GET /api/posts
 * Get all posts for authenticated user (paginated)
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const offset = (page - 1) * limit;

    const { count, rows: posts } = await Post.findAndCountAll({
      where: { userId: req.user!.id },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Profile,
          as: 'profile',
          attributes: ['id', 'name'],
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name'],
        },
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
    });

    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      data: posts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/posts/:id
 * Get a specific post by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;

    const post = await Post.findOne({
      where: { id, userId: req.user!.id },
      include: [
        {
          model: Profile,
          as: 'profile',
          attributes: ['id', 'name', 'bio', 'toneTags'],
        },
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'description', 'audience'],
        },
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name', 'styleGuidelines', 'maxLength'],
        },
      ],
    });

    if (!post) {
      sendNotFound(res, 'Post');
      return;
    }

    sendSuccess(res, post);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/posts/:id
 * Delete a post
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { id } = req.params;
    const post = await findUserResource(Post, id, req.user!.id);

    if (!post) {
      sendNotFound(res, 'Post');
      return;
    }

    await post.destroy();

    res.status(200).json({
      message: 'Post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};
