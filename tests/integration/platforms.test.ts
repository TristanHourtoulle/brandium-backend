import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Platform } from '../../src/models';

describe('Platforms API Integration Tests', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear database
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Register a test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    authToken = res.body.token;
    userId = res.body.user.id;
  });

  // =====================================
  // Complete CRUD Flow Test
  // =====================================
  describe('Complete CRUD Flow', () => {
    it('should create, read, update, and delete a platform', async () => {
      // 1. CREATE
      const createRes = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'LinkedIn',
          styleGuidelines: 'Professional tone, thought leadership, industry expertise',
          maxLength: 3000,
        })
        .expect(201);

      expect(createRes.body.data.name).toBe('LinkedIn');
      expect(createRes.body.data.maxLength).toBe(3000);
      const platformId = createRes.body.data.id;

      // 2. READ (single)
      const getOneRes = await request(app)
        .get(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getOneRes.body.data.id).toBe(platformId);
      expect(getOneRes.body.data.styleGuidelines).toBe(
        'Professional tone, thought leadership, industry expertise',
      );

      // 3. READ (list)
      const getAllRes = await request(app)
        .get('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getAllRes.body.count).toBe(1);
      expect(getAllRes.body.data[0].id).toBe(platformId);

      // 4. UPDATE
      const updateRes = await request(app)
        .put(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'LinkedIn Pro',
          maxLength: 2500,
        })
        .expect(200);

      expect(updateRes.body.data.name).toBe('LinkedIn Pro');
      expect(updateRes.body.data.maxLength).toBe(2500);
      // Unchanged fields should remain
      expect(updateRes.body.data.styleGuidelines).toBe(
        'Professional tone, thought leadership, industry expertise',
      );

      // 5. DELETE
      await request(app)
        .delete(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 6. Verify deletion
      await request(app)
        .get(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    it('should not allow access to other user platforms', async () => {
      // Create platform for first user
      const createRes = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'My LinkedIn' })
        .expect(201);

      const platformId = createRes.body.data.id;

      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Second user should NOT see first user's platforms
      const listRes = await request(app)
        .get('/api/platforms')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(listRes.body.count).toBe(0);

      // Second user should NOT access first user's platform by ID
      await request(app)
        .get(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT update first user's platform
      await request(app)
        .put(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      // Second user should NOT delete first user's platform
      await request(app)
        .delete(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Verify platform still exists for original user
      const verifyRes = await request(app)
        .get(`/api/platforms/${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.data.name).toBe('My LinkedIn');
    });
  });

  // =====================================
  // Authentication Tests
  // =====================================
  describe('Authentication Requirements', () => {
    it('should require authentication for all platform endpoints', async () => {
      // Create a platform first (for testing get/update/delete)
      const createRes = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(201);

      const platformId = createRes.body.data.id;

      // All requests without token should fail
      await request(app).get('/api/platforms').expect(401);
      await request(app).get(`/api/platforms/${platformId}`).expect(401);
      await request(app).post('/api/platforms').send({ name: 'New' }).expect(401);
      await request(app).put(`/api/platforms/${platformId}`).send({ name: 'Updated' }).expect(401);
      await request(app).delete(`/api/platforms/${platformId}`).expect(401);

      // Invalid token should fail
      await request(app)
        .get('/api/platforms')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =====================================
  // Multiple Platforms Test
  // =====================================
  describe('Multiple Platforms', () => {
    it('should allow user to have multiple platforms', async () => {
      // Create multiple platforms for different social networks
      await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'LinkedIn',
          styleGuidelines: 'Professional tone',
          maxLength: 3000,
        });

      await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'X (Twitter)',
          styleGuidelines: 'Concise, engaging',
          maxLength: 280,
        });

      await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'TikTok',
          styleGuidelines: 'Casual, trendy',
        });

      const listRes = await request(app)
        .get('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listRes.body.count).toBe(3);

      // Should be ordered by createdAt DESC
      expect(listRes.body.data[0].name).toBe('TikTok');
      expect(listRes.body.data[2].name).toBe('LinkedIn');
    });
  });

  // =====================================
  // Platform-Specific Tests
  // =====================================
  describe('Platform-Specific Features', () => {
    it('should support platform without maxLength', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Blog',
          styleGuidelines: 'Long-form content, detailed explanations',
        })
        .expect(201);

      expect(res.body.data.maxLength).toBeNull();
    });

    it('should enforce maxLength validation (must be positive)', async () => {
      await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid',
          maxLength: -100,
        })
        .expect(400);

      await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid',
          maxLength: 0,
        })
        .expect(400);
    });
  });
});
