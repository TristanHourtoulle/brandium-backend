import { Request, Response, NextFunction } from 'express';
import { HistoricalPost, Profile, Platform } from '../models';
import {
  findUserResource,
  sendNotFound,
  sendSuccess,
  sendSuccessWithMessage,
} from '../utils/controllerHelpers';

/**
 * Default pagination values
 */
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

/**
 * POST /api/profiles/:profileId/historical-posts
 * Create a new historical post for a profile
 */
export const create = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId } = req.params;
    const { content, platformId, publishedAt, externalUrl, engagement, metadata } = req.body;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, profileId, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    // Verify platform exists and belongs to user (if provided)
    if (platformId) {
      const platform = await findUserResource(Platform, platformId, req.user!.id);
      if (!platform) {
        sendNotFound(res, 'Platform');
        return;
      }
    }

    const historicalPost = await HistoricalPost.create({
      userId: req.user!.id,
      profileId,
      platformId: platformId || null,
      content,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
      externalUrl: externalUrl || null,
      engagement: engagement || {},
      metadata: metadata || {},
    });

    sendSuccessWithMessage(res, 'Historical post created successfully', historicalPost, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/profiles/:profileId/historical-posts
 * Get all historical posts for a profile (paginated)
 */
export const getAll = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId } = req.params;
    const page = parseInt(req.query.page as string) || DEFAULT_PAGE;
    const limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;
    const offset = (page - 1) * limit;
    const platformId = req.query.platformId as string | undefined;
    const sortBy = (req.query.sortBy as string) || 'publishedAt';
    const order = ((req.query.order as string) || 'DESC').toUpperCase() as 'ASC' | 'DESC';

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, profileId, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    // Build where clause
    const whereClause: Record<string, unknown> = {
      profileId,
      userId: req.user!.id,
    };

    // Filter by platform if provided
    if (platformId) {
      whereClause.platformId = platformId;
    }

    // Validate sortBy field
    const allowedSortFields = ['publishedAt', 'createdAt', 'updatedAt'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'publishedAt';

    const { count, rows: posts } = await HistoricalPost.findAndCountAll({
      where: whereClause,
      order: [[sortField, order]],
      limit,
      offset,
      include: [
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
 * GET /api/profiles/:profileId/historical-posts/:id
 * Get a specific historical post by ID
 */
export const getById = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId, id } = req.params;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, profileId, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    const post = await HistoricalPost.findOne({
      where: {
        id,
        profileId,
        userId: req.user!.id,
      },
      include: [
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
    });

    if (!post) {
      sendNotFound(res, 'Historical post');
      return;
    }

    sendSuccess(res, post);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/profiles/:profileId/historical-posts/:id
 * Update a historical post
 */
export const update = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId, id } = req.params;
    const { content, platformId, publishedAt, externalUrl, engagement, metadata } = req.body;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, profileId, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    const post = await HistoricalPost.findOne({
      where: {
        id,
        profileId,
        userId: req.user!.id,
      },
    });

    if (!post) {
      sendNotFound(res, 'Historical post');
      return;
    }

    // Verify new platform exists and belongs to user (if provided)
    if (platformId !== undefined && platformId !== null) {
      const platform = await findUserResource(Platform, platformId, req.user!.id);
      if (!platform) {
        sendNotFound(res, 'Platform');
        return;
      }
    }

    // Build update object - only include fields that were provided
    const updates: Partial<{
      content: string;
      platformId: string | null;
      publishedAt: Date | null;
      externalUrl: string | null;
      engagement: Record<string, unknown>;
      metadata: Record<string, unknown>;
    }> = {};

    if (content !== undefined) updates.content = content;
    if (platformId !== undefined) updates.platformId = platformId;
    if (publishedAt !== undefined) updates.publishedAt = publishedAt ? new Date(publishedAt) : null;
    if (externalUrl !== undefined) updates.externalUrl = externalUrl;
    if (engagement !== undefined) updates.engagement = engagement;
    if (metadata !== undefined) updates.metadata = metadata;

    await post.update(updates);

    // Reload with platform association
    await post.reload({
      include: [
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
    });

    sendSuccessWithMessage(res, 'Historical post updated successfully', post);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/profiles/:profileId/historical-posts/:id
 * Delete a historical post
 */
export const remove = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId, id } = req.params;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, profileId, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    const post = await HistoricalPost.findOne({
      where: {
        id,
        profileId,
        userId: req.user!.id,
      },
    });

    if (!post) {
      sendNotFound(res, 'Historical post');
      return;
    }

    await post.destroy();

    res.status(200).json({
      message: 'Historical post deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/profiles/:profileId/historical-posts/bulk
 * Bulk create historical posts for a profile
 */
export const bulkCreate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId } = req.params;
    const { posts } = req.body;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, profileId, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    // Validate posts array
    if (!Array.isArray(posts) || posts.length === 0) {
      res.status(400).json({
        error: 'Validation Error',
        message: 'posts must be a non-empty array',
      });
      return;
    }

    // Limit bulk import size
    const MAX_BULK_SIZE = 100;
    if (posts.length > MAX_BULK_SIZE) {
      res.status(400).json({
        error: 'Validation Error',
        message: `Cannot import more than ${MAX_BULK_SIZE} posts at once`,
      });
      return;
    }

    // Collect all platformIds to validate
    const platformIds = [...new Set(posts.map(p => p.platformId).filter(Boolean))];

    // Verify all platforms belong to user
    if (platformIds.length > 0) {
      const platforms = await Platform.findAll({
        where: {
          id: platformIds,
          userId: req.user!.id,
        },
      });

      const validPlatformIds = new Set(platforms.map(p => p.id));
      const invalidPlatformIds = platformIds.filter(id => !validPlatformIds.has(id));

      if (invalidPlatformIds.length > 0) {
        res.status(400).json({
          error: 'Validation Error',
          message: `Invalid platform IDs: ${invalidPlatformIds.join(', ')}`,
        });
        return;
      }
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [] as { index: number; reason: string }[],
    };

    const createdPosts = [];

    for (let i = 0; i < posts.length; i++) {
      const postData = posts[i];

      try {
        // Validate required fields
        if (!postData.content || postData.content.trim().length === 0) {
          results.failed++;
          results.errors.push({ index: i, reason: 'Content is required' });
          continue;
        }

        const historicalPost = await HistoricalPost.create({
          userId: req.user!.id,
          profileId,
          platformId: postData.platformId || null,
          content: postData.content,
          publishedAt: postData.publishedAt ? new Date(postData.publishedAt) : null,
          externalUrl: postData.externalUrl || null,
          engagement: postData.engagement || {},
          metadata: postData.metadata || {},
        });

        createdPosts.push(historicalPost);
        results.created++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          index: i,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.status(201).json({
      message: `Bulk import completed: ${results.created} created, ${results.failed} failed`,
      created: results.created,
      failed: results.failed,
      errors: results.errors.length > 0 ? results.errors : undefined,
      data: createdPosts,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/profiles/:profileId/historical-posts/stats
 * Get statistics for historical posts of a profile
 */
export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { profileId } = req.params;

    // Verify profile exists and belongs to user
    const profile = await findUserResource(Profile, profileId, req.user!.id);
    if (!profile) {
      sendNotFound(res, 'Profile');
      return;
    }

    // Get total count
    const totalCount = await HistoricalPost.count({
      where: {
        profileId,
        userId: req.user!.id,
      },
    });

    // Get count per platform
    const posts = await HistoricalPost.findAll({
      where: {
        profileId,
        userId: req.user!.id,
      },
      attributes: ['platformId', 'publishedAt', 'engagement'],
      include: [
        {
          model: Platform,
          as: 'platform',
          attributes: ['id', 'name'],
        },
      ],
    });

    // Calculate stats
    const platformStats: Record<string, { count: number; name: string | null }> = {};
    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalViews = 0;
    let postsWithEngagement = 0;
    let oldestPost: Date | null = null;
    let newestPost: Date | null = null;

    for (const post of posts) {
      // Platform stats
      const platformKey = post.platformId || 'no_platform';
      if (!platformStats[platformKey]) {
        platformStats[platformKey] = {
          count: 0,
          name: post.platform?.name || null,
        };
      }
      platformStats[platformKey].count++;

      // Engagement stats
      const engagement = post.engagement || {};
      if (Object.keys(engagement).length > 0) {
        postsWithEngagement++;
        totalLikes += (engagement.likes as number) || 0;
        totalComments += (engagement.comments as number) || 0;
        totalShares += (engagement.shares as number) || 0;
        totalViews += (engagement.views as number) || 0;
      }

      // Date range
      if (post.publishedAt) {
        if (!oldestPost || post.publishedAt < oldestPost) {
          oldestPost = post.publishedAt;
        }
        if (!newestPost || post.publishedAt > newestPost) {
          newestPost = post.publishedAt;
        }
      }
    }

    res.status(200).json({
      data: {
        totalPosts: totalCount,
        byPlatform: Object.entries(platformStats).map(([id, stats]) => ({
          platformId: id === 'no_platform' ? null : id,
          platformName: stats.name,
          count: stats.count,
        })),
        engagement: {
          postsWithEngagement,
          totalLikes,
          totalComments,
          totalShares,
          totalViews,
          averageLikes: postsWithEngagement > 0 ? Math.round(totalLikes / postsWithEngagement) : 0,
          averageComments: postsWithEngagement > 0 ? Math.round(totalComments / postsWithEngagement) : 0,
        },
        dateRange: {
          oldest: oldestPost,
          newest: newestPost,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
