import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Platform, HistoricalPost } from '../../src/models';

describe('Profile Analysis API Integration Tests', () => {
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
        bio: 'A test profile for analysis',
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
  // Analysis Stats Tests
  // =====================================
  describe('GET /api/profiles/:id/analysis-stats', () => {
    it('should return stats for a profile with no posts', async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/analysis-stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.totalPosts).toBe(0);
      expect(res.body.data.hasEnoughPosts).toBe(false);
      expect(res.body.data.minimumRequired).toBe(5);
      expect(res.body.data.readyForAnalysis).toBe(false);
    });

    it('should return stats for a profile with some posts', async () => {
      // Create 3 posts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/profiles/${profileId}/historical-posts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: `Test post ${i + 1} with some content for analysis`,
            platformId,
          });
      }

      const res = await request(app)
        .get(`/api/profiles/${profileId}/analysis-stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.totalPosts).toBe(3);
      expect(res.body.data.hasEnoughPosts).toBe(false);
      expect(res.body.data.message).toContain('Need at least 5 posts');
    });

    it('should return ready for analysis when enough posts exist', async () => {
      // Create 5 posts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post(`/api/profiles/${profileId}/historical-posts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: `Test post ${i + 1} with enough content for meaningful analysis`,
            platformId: i % 2 === 0 ? platformId : undefined,
          });
      }

      const res = await request(app)
        .get(`/api/profiles/${profileId}/analysis-stats`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.totalPosts).toBe(5);
      expect(res.body.data.hasEnoughPosts).toBe(true);
      expect(res.body.data.readyForAnalysis).toBe(true);
      expect(res.body.data.platforms).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent profile', async () => {
      await request(app)
        .get('/api/profiles/00000000-0000-0000-0000-000000000000/analysis-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/profiles/${profileId}/analysis-stats`)
        .expect(401);
    });
  });

  // =====================================
  // Analyze From Posts Tests
  // =====================================
  describe('POST /api/profiles/:id/analyze-from-posts', () => {
    it('should return error when not enough posts', async () => {
      // Create only 3 posts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`/api/profiles/${profileId}/historical-posts`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            content: `Test post ${i + 1} with content for analysis`,
          });
      }

      const res = await request(app)
        .post(`/api/profiles/${profileId}/analyze-from-posts`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.error).toBe('Insufficient Data');
      expect(res.body.code).toBe('INSUFFICIENT_POSTS');
    });

    it('should return 404 for non-existent profile', async () => {
      await request(app)
        .post('/api/profiles/00000000-0000-0000-0000-000000000000/analyze-from-posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/profiles/${profileId}/analyze-from-posts`)
        .expect(401);
    });

    it('should validate maxPosts query parameter', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/analyze-from-posts?maxPosts=1000`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should validate autoApply query parameter', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/analyze-from-posts?autoApply=maybe`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });
  });

  // =====================================
  // Apply Analysis Tests
  // =====================================
  describe('POST /api/profiles/:id/apply-analysis', () => {
    it('should apply analysis suggestions to profile', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/apply-analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toneTags: ['professional', 'friendly', 'technical'],
          doRules: ['Use concrete examples', 'Start with a question'],
          dontRules: ['Avoid jargon', 'No excessive caps'],
        })
        .expect(200);

      expect(res.body.message).toContain('applied');
      expect(res.body.data.toneTags).toEqual(['professional', 'friendly', 'technical']);
      expect(res.body.data.doRules).toEqual(['Use concrete examples', 'Start with a question']);
      expect(res.body.data.dontRules).toEqual(['Avoid jargon', 'No excessive caps']);
    });

    it('should allow partial updates', async () => {
      // First set some values
      await request(app)
        .post(`/api/profiles/${profileId}/apply-analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toneTags: ['professional'],
          doRules: ['Rule 1'],
          dontRules: ['Dont 1'],
        });

      // Then update only toneTags
      const res = await request(app)
        .post(`/api/profiles/${profileId}/apply-analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toneTags: ['casual', 'friendly'],
        })
        .expect(200);

      expect(res.body.data.toneTags).toEqual(['casual', 'friendly']);
      // Other fields should be unchanged from profile's current state
    });

    it('should return error if no fields provided', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/apply-analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should validate toneTags is an array', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/apply-analysis`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toneTags: 'not-an-array',
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should return 404 for non-existent profile', async () => {
      await request(app)
        .post('/api/profiles/00000000-0000-0000-0000-000000000000/apply-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toneTags: ['test'],
        })
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/profiles/${profileId}/apply-analysis`)
        .send({
          toneTags: ['test'],
        })
        .expect(401);
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    it('should not allow access to other user profile analysis', async () => {
      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Second user should NOT access first user's analysis stats
      await request(app)
        .get(`/api/profiles/${profileId}/analysis-stats`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT analyze first user's profile
      await request(app)
        .post(`/api/profiles/${profileId}/analyze-from-posts`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT apply analysis to first user's profile
      await request(app)
        .post(`/api/profiles/${profileId}/apply-analysis`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          toneTags: ['hacked'],
        })
        .expect(404);
    });
  });

  // =====================================
  // Validation Tests
  // =====================================
  describe('Validation', () => {
    it('should reject invalid profile UUID', async () => {
      await request(app)
        .get('/api/profiles/invalid-uuid/analysis-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      await request(app)
        .post('/api/profiles/invalid-uuid/analyze-from-posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      await request(app)
        .post('/api/profiles/invalid-uuid/apply-analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ toneTags: ['test'] })
        .expect(400);
    });

    it('should reject invalid platformId filter', async () => {
      await request(app)
        .post(`/api/profiles/${profileId}/analyze-from-posts?platformId=not-uuid`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
