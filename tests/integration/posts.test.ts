import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Post, Profile, Project, Platform } from '../../src/models';

describe('Posts API Integration Tests', () => {
  let authToken: string;
  let userId: string;
  let testProfile: Profile;
  let testProject: Project;
  let testPlatform: Platform;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear database in correct order (posts first due to foreign keys)
    await Post.destroy({ where: {}, truncate: true, cascade: true });
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
    await Project.destroy({ where: {}, truncate: true, cascade: true });
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Register a test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    authToken = res.body.token;
    userId = res.body.user.id;

    // Create related entities for testing
    testProfile = await Profile.create({
      name: 'Integration Test Profile',
      bio: 'Bio for integration tests',
      toneTags: ['professional', 'friendly'],
      doRules: ['Use examples'],
      dontRules: ['Avoid jargon'],
      userId,
    });

    testProject = await Project.create({
      name: 'Integration Test Project',
      description: 'Project for integration tests',
      audience: 'Developers',
      keyMessages: ['Innovation', 'Quality'],
      userId,
    });

    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional, engaging',
      maxLength: 3000,
      userId,
    });
  });

  // =====================================
  // Complete Read & Delete Flow Test
  // =====================================
  describe('Complete Read & Delete Flow', () => {
    it('should list, read, and delete posts', async () => {
      // Create posts directly (simulating posts created via /api/generate)
      const post1 = await Post.create({
        rawIdea: 'First test idea',
        generatedText: 'First generated content for testing',
        goal: 'Announce feature',
        userId,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });

      const post2 = await Post.create({
        rawIdea: 'Second test idea',
        generatedText: 'Second generated content',
        userId,
      });

      // 1. LIST - Should return both posts with pagination
      const listRes = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listRes.body.pagination.total).toBe(2);
      expect(listRes.body.data).toHaveLength(2);
      // Both posts should be returned (order may vary when timestamps are identical)
      const returnedIds = listRes.body.data.map((p: { id: string }) => p.id);
      expect(returnedIds).toContain(post1.id);
      expect(returnedIds).toContain(post2.id);

      // 2. READ (single with full context)
      const getOneRes = await request(app)
        .get(`/api/posts/${post1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getOneRes.body.data.id).toBe(post1.id);
      expect(getOneRes.body.data.rawIdea).toBe('First test idea');
      expect(getOneRes.body.data.generatedText).toBe('First generated content for testing');
      expect(getOneRes.body.data.goal).toBe('Announce feature');
      expect(getOneRes.body.data.profile.name).toBe('Integration Test Profile');
      expect(getOneRes.body.data.project.name).toBe('Integration Test Project');
      expect(getOneRes.body.data.platform.name).toBe('LinkedIn');

      // 3. DELETE
      await request(app)
        .delete(`/api/posts/${post1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 4. Verify deletion
      await request(app)
        .get(`/api/posts/${post1.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // 5. Verify list now shows only 1 post
      const listAfterDelete = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listAfterDelete.body.pagination.total).toBe(1);
      expect(listAfterDelete.body.data[0].id).toBe(post2.id);
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    it('should not allow access to other user posts', async () => {
      // Create post for first user
      const post = await Post.create({
        rawIdea: 'My post idea',
        generatedText: 'My generated content',
        userId,
      });

      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Second user should NOT see first user's posts
      const listRes = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(listRes.body.pagination.total).toBe(0);
      expect(listRes.body.data).toHaveLength(0);

      // Second user should NOT access first user's post by ID
      await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT delete first user's post
      await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Verify post still exists for original user
      const verifyRes = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.data.rawIdea).toBe('My post idea');
    });
  });

  // =====================================
  // Authentication Tests
  // =====================================
  describe('Authentication Requirements', () => {
    it('should require authentication for all post endpoints', async () => {
      // Create a post first (for testing get/delete)
      const post = await Post.create({
        rawIdea: 'Test',
        generatedText: 'Test generated',
        userId,
      });

      // All requests without token should fail
      await request(app).get('/api/posts').expect(401);
      await request(app).get(`/api/posts/${post.id}`).expect(401);
      await request(app).delete(`/api/posts/${post.id}`).expect(401);

      // Invalid token should fail
      await request(app)
        .get('/api/posts')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =====================================
  // Pagination Tests
  // =====================================
  describe('Pagination', () => {
    it('should paginate large number of posts correctly', async () => {
      // Create 25 posts
      for (let i = 1; i <= 25; i++) {
        await Post.create({
          rawIdea: `Post idea ${i}`,
          generatedText: `Generated content ${i}`,
          userId,
        });
      }

      // Default pagination (page 1, limit 10)
      const page1 = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page1.body.data).toHaveLength(10);
      expect(page1.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });

      // Page 2
      const page2 = await request(app)
        .get('/api/posts?page=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page2.body.data).toHaveLength(10);
      expect(page2.body.pagination.page).toBe(2);
      expect(page2.body.pagination.hasNext).toBe(true);
      expect(page2.body.pagination.hasPrev).toBe(true);

      // Page 3 (last page with 5 items)
      const page3 = await request(app)
        .get('/api/posts?page=3')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page3.body.data).toHaveLength(5);
      expect(page3.body.pagination.hasNext).toBe(false);
      expect(page3.body.pagination.hasPrev).toBe(true);

      // Custom limit
      const customLimit = await request(app)
        .get('/api/posts?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(customLimit.body.data).toHaveLength(5);
      expect(customLimit.body.pagination.totalPages).toBe(5);
    });

    it('should handle empty page gracefully', async () => {
      // Create only 5 posts
      for (let i = 1; i <= 5; i++) {
        await Post.create({
          rawIdea: `Post ${i}`,
          generatedText: `Generated ${i}`,
          userId,
        });
      }

      // Request page 2 when there's only 1 page
      const res = await request(app)
        .get('/api/posts?page=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
      expect(res.body.pagination.page).toBe(2);
      expect(res.body.pagination.total).toBe(5);
    });
  });

  // =====================================
  // Related Entities Tests
  // =====================================
  describe('Related Entities', () => {
    it('should include related entities in list view', async () => {
      await Post.create({
        rawIdea: 'Test with relations',
        generatedText: 'Generated with context',
        userId,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const post = res.body.data[0];
      expect(post.profile).toEqual({ id: testProfile.id, name: 'Integration Test Profile' });
      expect(post.project).toEqual({ id: testProject.id, name: 'Integration Test Project' });
      expect(post.platform).toEqual({ id: testPlatform.id, name: 'LinkedIn' });
    });

    it('should include detailed related entities in single view', async () => {
      const post = await Post.create({
        rawIdea: 'Test with relations',
        generatedText: 'Generated with context',
        userId,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });

      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.profile).toMatchObject({
        id: testProfile.id,
        name: 'Integration Test Profile',
        bio: 'Bio for integration tests',
        toneTags: ['professional', 'friendly'],
      });

      expect(res.body.data.project).toMatchObject({
        id: testProject.id,
        name: 'Integration Test Project',
        description: 'Project for integration tests',
        audience: 'Developers',
      });

      expect(res.body.data.platform).toMatchObject({
        id: testPlatform.id,
        name: 'LinkedIn',
        styleGuidelines: 'Professional, engaging',
        maxLength: 3000,
      });
    });

    it('should handle deleted related entities gracefully', async () => {
      // Create a post with all relations
      const post = await Post.create({
        rawIdea: 'Test',
        generatedText: 'Generated',
        userId,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });

      // Delete the profile (should set profileId to NULL due to onDelete: SET NULL)
      await testProfile.destroy();

      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Profile should be null, others should still exist
      expect(res.body.data.profile).toBeNull();
      expect(res.body.data.project).not.toBeNull();
      expect(res.body.data.platform).not.toBeNull();
    });
  });

  // =====================================
  // Validation Tests
  // =====================================
  describe('Validation', () => {
    it('should return 400 for invalid UUID in getById', async () => {
      const res = await request(app)
        .get('/api/posts/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should return 400 for invalid UUID in delete', async () => {
      const res = await request(app)
        .delete('/api/posts/not-a-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      await request(app)
        .get('/api/posts?page=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      await request(app)
        .get('/api/posts?page=-1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      await request(app)
        .get('/api/posts?limit=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      await request(app)
        .get('/api/posts?limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
