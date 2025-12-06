import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Platform, HistoricalPost } from '../../src/models';

describe('Historical Posts API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let profileId: string;
  let platformId: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear database
    await HistoricalPost.destroy({ where: {}, truncate: true, cascade: true });
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Register a test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    authToken = res.body.token;
    userId = res.body.user.id;

    // Create a test profile
    const profileRes = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Profile',
        bio: 'A test profile for historical posts',
      });

    profileId = profileRes.body.data.id;

    // Create a test platform
    const platformRes = await request(app)
      .post('/api/platforms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'LinkedIn',
        styleGuidelines: 'Professional tone',
        maxLength: 3000,
      });

    platformId = platformRes.body.data.id;
  });

  // =====================================
  // Complete CRUD Flow Test
  // =====================================
  describe('Complete CRUD Flow', () => {
    it('should create, read, update, and delete a historical post', async () => {
      // 1. CREATE
      const createRes = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is my first historical post about tech and innovation.',
          platformId,
          publishedAt: '2024-01-15T10:30:00Z',
          externalUrl: 'https://linkedin.com/posts/123',
          engagement: {
            likes: 150,
            comments: 25,
            shares: 10,
          },
        })
        .expect(201);

      expect(createRes.body.data.content).toBe(
        'This is my first historical post about tech and innovation.',
      );
      expect(createRes.body.data.engagement.likes).toBe(150);
      const postId = createRes.body.data.id;

      // 2. READ (single)
      const getOneRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getOneRes.body.data.id).toBe(postId);
      expect(getOneRes.body.data.platform.name).toBe('LinkedIn');

      // 3. READ (list)
      const getAllRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getAllRes.body.pagination.total).toBe(1);
      expect(getAllRes.body.data[0].id).toBe(postId);

      // 4. UPDATE
      const updateRes = await request(app)
        .patch(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content with more details about AI.',
          engagement: {
            likes: 200,
            comments: 30,
            shares: 15,
          },
        })
        .expect(200);

      expect(updateRes.body.data.content).toBe('Updated content with more details about AI.');
      expect(updateRes.body.data.engagement.likes).toBe(200);

      // 5. DELETE
      await request(app)
        .delete(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 6. Verify deletion
      await request(app)
        .get(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // =====================================
  // Bulk Create Test
  // =====================================
  describe('Bulk Create', () => {
    it('should bulk create multiple historical posts', async () => {
      const bulkRes = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          posts: [
            {
              content: 'First bulk post about technology',
              platformId,
              publishedAt: '2024-01-10T09:00:00Z',
              engagement: { likes: 50 },
            },
            {
              content: 'Second bulk post about startups',
              platformId,
              publishedAt: '2024-01-12T14:00:00Z',
              engagement: { likes: 75 },
            },
            {
              content: 'Third bulk post about AI',
              publishedAt: '2024-01-15T11:00:00Z',
            },
          ],
        })
        .expect(201);

      expect(bulkRes.body.created).toBe(3);
      expect(bulkRes.body.failed).toBe(0);
      expect(bulkRes.body.data).toHaveLength(3);

      // Verify all posts exist
      const getAllRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getAllRes.body.pagination.total).toBe(3);
    });

    it('should reject bulk create with invalid content in validation', async () => {
      // Empty content should be rejected by validator
      const bulkRes = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          posts: [
            {
              content: 'Valid post',
              platformId,
            },
            {
              content: '', // Invalid: empty content - rejected by validator
            },
            {
              content: 'Another valid post',
            },
          ],
        })
        .expect(400);

      expect(bulkRes.body.error).toBe('Validation Error');
    });

    it('should handle database-level failures in bulk create', async () => {
      // Use an invalid platformId that doesn't exist (will fail at DB level)
      const fakePlatformId = '00000000-0000-0000-0000-000000000000';

      const bulkRes = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          posts: [
            {
              content: 'Valid post with valid platform',
              platformId,
            },
            {
              content: 'Post with invalid platform',
              platformId: fakePlatformId,
            },
            {
              content: 'Another valid post without platform',
            },
          ],
        })
        .expect(400); // Should fail because invalid platform

      expect(bulkRes.body.error).toBe('Validation Error');
    });
  });

  // =====================================
  // Statistics Test
  // =====================================
  describe('Statistics', () => {
    it('should return correct statistics for historical posts', async () => {
      // Create posts with different platforms and engagement
      await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          posts: [
            {
              content: 'Post 1',
              platformId,
              publishedAt: '2024-01-10T09:00:00Z',
              engagement: { likes: 100, comments: 10 },
            },
            {
              content: 'Post 2',
              platformId,
              publishedAt: '2024-01-15T09:00:00Z',
              engagement: { likes: 200, comments: 20 },
            },
            {
              content: 'Post 3 - no platform',
              publishedAt: '2024-01-20T09:00:00Z',
              engagement: { likes: 50, comments: 5 },
            },
          ],
        });

      const statsRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsRes.body.data.totalPosts).toBe(3);
      expect(statsRes.body.data.byPlatform).toHaveLength(2); // LinkedIn + no_platform
      expect(statsRes.body.data.engagement.totalLikes).toBe(350);
      expect(statsRes.body.data.engagement.totalComments).toBe(35);
      expect(statsRes.body.data.engagement.postsWithEngagement).toBe(3);
    });
  });

  // =====================================
  // Pagination and Filtering Test
  // =====================================
  describe('Pagination and Filtering', () => {
    beforeEach(async () => {
      // Create 25 historical posts
      const posts = Array.from({ length: 25 }, (_, i) => ({
        content: `Historical post number ${i + 1}`,
        platformId: i % 2 === 0 ? platformId : null,
        publishedAt: new Date(2024, 0, i + 1).toISOString(),
      }));

      await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ posts });
    });

    it('should paginate results correctly', async () => {
      // First page
      const page1Res = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts?page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page1Res.body.data).toHaveLength(10);
      expect(page1Res.body.pagination.total).toBe(25);
      expect(page1Res.body.pagination.totalPages).toBe(3);
      expect(page1Res.body.pagination.hasNext).toBe(true);
      expect(page1Res.body.pagination.hasPrev).toBe(false);

      // Second page
      const page2Res = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts?page=2&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page2Res.body.data).toHaveLength(10);
      expect(page2Res.body.pagination.hasNext).toBe(true);
      expect(page2Res.body.pagination.hasPrev).toBe(true);

      // Third page
      const page3Res = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts?page=3&limit=10`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page3Res.body.data).toHaveLength(5);
      expect(page3Res.body.pagination.hasNext).toBe(false);
    });

    it('should filter by platform', async () => {
      const filteredRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts?platformId=${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Even numbered posts have platformId (0, 2, 4, ... 24 = 13 posts)
      expect(filteredRes.body.pagination.total).toBe(13);
      filteredRes.body.data.forEach((post: { platformId: string }) => {
        expect(post.platformId).toBe(platformId);
      });
    });

    it('should sort by different fields', async () => {
      const ascRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts?sortBy=publishedAt&order=ASC&limit=25`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const descRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts?sortBy=publishedAt&order=DESC&limit=25`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify order is reversed
      expect(ascRes.body.data.length).toBe(25);
      expect(descRes.body.data.length).toBe(25);

      // First item in ASC should be last in DESC (same post, different position)
      const ascFirstId = ascRes.body.data[0].id;
      const descLastId = descRes.body.data[descRes.body.data.length - 1].id;
      expect(ascFirstId).toBe(descLastId);

      // Last item in ASC should be first in DESC
      const ascLastId = ascRes.body.data[ascRes.body.data.length - 1].id;
      const descFirstId = descRes.body.data[0].id;
      expect(ascLastId).toBe(descFirstId);
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    it('should not allow access to other user historical posts', async () => {
      // Create historical post for first user
      const createRes = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'My private post',
        })
        .expect(201);

      const postId = createRes.body.data.id;

      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Create profile for second user
      const profile2Res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'User 2 Profile' });
      const profile2Id = profile2Res.body.data.id;

      // Second user should NOT see first user's profile's historical posts
      await request(app)
        .get(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404); // Profile not found (belongs to other user)

      // Second user should NOT access first user's historical post by ID
      await request(app)
        .get(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT update first user's historical post
      await request(app)
        .patch(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ content: 'Hacked!' })
        .expect(404);

      // Second user should NOT delete first user's historical post
      await request(app)
        .delete(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Verify post still exists for original user
      const verifyRes = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.data.content).toBe('My private post');
    });
  });

  // =====================================
  // Authentication Tests
  // =====================================
  describe('Authentication Requirements', () => {
    it('should require authentication for all historical post endpoints', async () => {
      // Create a historical post first
      const createRes = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test post' })
        .expect(201);

      const postId = createRes.body.data.id;

      // All requests without token should fail
      await request(app).get(`/api/profiles/${profileId}/historical-posts`).expect(401);
      await request(app).get(`/api/profiles/${profileId}/historical-posts/${postId}`).expect(401);
      await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .send({ content: 'New' })
        .expect(401);
      await request(app)
        .patch(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .send({ content: 'Updated' })
        .expect(401);
      await request(app).delete(`/api/profiles/${profileId}/historical-posts/${postId}`).expect(401);
      await request(app).get(`/api/profiles/${profileId}/historical-posts/stats`).expect(401);
      await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .send({ posts: [] })
        .expect(401);
    });
  });

  // =====================================
  // Validation Tests
  // =====================================
  describe('Validation', () => {
    it('should reject empty content', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should reject invalid UUID for profileId', async () => {
      await request(app)
        .get('/api/profiles/invalid-uuid/historical-posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should reject invalid platformId', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Valid content',
          platformId: 'not-a-uuid',
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should reject invalid date format for publishedAt', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Valid content',
          publishedAt: 'not-a-date',
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });
  });

  // =====================================
  // Edge Cases and Error Handling
  // =====================================
  describe('Edge Cases', () => {
    it('should return 404 when creating post with non-existent profile', async () => {
      const fakeProfileId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .post(`/api/profiles/${fakeProfileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test content' })
        .expect(404);
    });

    it('should return 404 when creating post with non-existent platform', async () => {
      const fakePlatformId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test content',
          platformId: fakePlatformId,
        })
        .expect(404);
    });

    it('should return 404 when getting non-existent post', async () => {
      const fakePostId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/profiles/${profileId}/historical-posts/${fakePostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 when updating non-existent post', async () => {
      const fakePostId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .patch(`/api/profiles/${profileId}/historical-posts/${fakePostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' })
        .expect(404);
    });

    it('should return 404 when updating post with non-existent platform', async () => {
      // First create a post
      const createRes = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Original content' })
        .expect(201);

      const postId = createRes.body.data.id;
      const fakePlatformId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .patch(`/api/profiles/${profileId}/historical-posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ platformId: fakePlatformId })
        .expect(404);
    });

    it('should return 404 when deleting non-existent post', async () => {
      const fakePostId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .delete(`/api/profiles/${profileId}/historical-posts/${fakePostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for stats with non-existent profile', async () => {
      const fakeProfileId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/profiles/${fakeProfileId}/historical-posts/stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for bulk create with non-existent profile', async () => {
      const fakeProfileId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .post(`/api/profiles/${fakeProfileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ posts: [{ content: 'Test' }] })
        .expect(404);
    });
  });

  // =====================================
  // Bulk Create Validation Tests
  // =====================================
  describe('Bulk Create Validation', () => {
    it('should reject empty posts array in bulk create', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ posts: [] })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should reject non-array posts in bulk create', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ posts: 'not-an-array' })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should reject bulk create with more than 100 posts', async () => {
      const posts = Array.from({ length: 101 }, (_, i) => ({
        content: `Post ${i + 1} with valid content`,
      }));

      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ posts })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should reject bulk create with empty content in validation', async () => {
      // Empty content is rejected by validator, not controller
      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          posts: [
            { content: 'Valid post 1' },
            { content: '' }, // Empty content - rejected by validator
            { content: 'Valid post 2' },
          ],
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should handle all valid posts successfully', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/historical-posts/bulk`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          posts: [
            { content: 'Valid post 1' },
            { content: 'Valid post 2' },
            { content: 'Valid post 3' },
          ],
        })
        .expect(201);

      expect(res.body.created).toBe(3);
      expect(res.body.failed).toBe(0);
    });
  });

  // =====================================
  // Cascade Delete Test
  // =====================================
  describe('Cascade Delete', () => {
    it('should delete historical posts when profile is deleted', async () => {
      // Create historical posts
      await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Post 1' });

      await request(app)
        .post(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Post 2' });

      // Verify posts exist
      const beforeDelete = await request(app)
        .get(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(beforeDelete.body.pagination.total).toBe(2);

      // Delete profile
      await request(app)
        .delete(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify profile and posts are gone
      await request(app)
        .get(`/api/profiles/${profileId}/historical-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify posts are deleted from database
      const postsInDb = await HistoricalPost.count({
        where: { profileId },
      });
      expect(postsInDb).toBe(0);
    });
  });
});
