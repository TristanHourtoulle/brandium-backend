import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Platform } from '../../src/models';

describe('PlatformController Unit Tests', () => {
  let testUser: User;
  let authToken: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up database
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Create a test user and get token
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    testUser = await User.findOne({ where: { email: 'test@example.com' } }) as User;
    authToken = res.body.token;
  });

  // =====================================
  // GET /api/platforms - Get All Platforms
  // =====================================
  describe('GET /api/platforms', () => {
    it('should return empty array when no platforms exist', async () => {
      const res = await request(app)
        .get('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 0);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toEqual([]);
    });

    it('should return all platforms for authenticated user', async () => {
      await Platform.create({
        name: 'LinkedIn',
        styleGuidelines: 'Professional tone, use bullet points',
        maxLength: 3000,
        userId: testUser.id,
      });
      await Platform.create({
        name: 'X',
        styleGuidelines: 'Concise, engaging',
        maxLength: 280,
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 2);
      expect(res.body.data).toHaveLength(2);
    });

    it('should not return platforms from other users', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      // Create platform for other user
      await Platform.create({
        name: 'Other Platform',
        userId: otherUser.id,
      });

      // Create platform for test user
      await Platform.create({
        name: 'My Platform',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 1);
      expect(res.body.data[0].name).toBe('My Platform');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/platforms').expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  // =====================================
  // GET /api/platforms/:id - Get Platform By ID
  // =====================================
  describe('GET /api/platforms/:id', () => {
    it('should return a platform by ID', async () => {
      const platform = await Platform.create({
        name: 'LinkedIn',
        styleGuidelines: 'Professional tone, industry expertise, thought leadership',
        maxLength: 3000,
        userId: testUser.id,
      });

      const res = await request(app)
        .get(`/api/platforms/${platform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe('LinkedIn');
      expect(res.body.data.styleGuidelines).toBe('Professional tone, industry expertise, thought leadership');
      expect(res.body.data.maxLength).toBe(3000);
    });

    it('should return 404 for non-existent platform', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/api/platforms/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
      expect(res.body).toHaveProperty('message', 'Platform not found');
    });

    it('should return 404 for platform owned by another user', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherPlatform = await Platform.create({
        name: 'Other Platform',
        userId: otherUser.id,
      });

      const res = await request(app)
        .get(`/api/platforms/${otherPlatform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/platforms/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });

  // =====================================
  // POST /api/platforms - Create Platform
  // =====================================
  describe('POST /api/platforms', () => {
    it('should create a new platform with all fields', async () => {
      const platformData = {
        name: 'LinkedIn',
        styleGuidelines: 'Professional, use bullet points, share expertise',
        maxLength: 3000,
      };

      const res = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(platformData)
        .expect(201);

      expect(res.body).toHaveProperty('message', 'Platform created successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe('LinkedIn');
      expect(res.body.data.styleGuidelines).toBe('Professional, use bullet points, share expertise');
      expect(res.body.data.maxLength).toBe(3000);
      expect(res.body.data.userId).toBe(testUser.id);
    });

    it('should create a platform with only required fields', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'TikTok' })
        .expect(201);

      expect(res.body.data.name).toBe('TikTok');
      expect(res.body.data.styleGuidelines).toBeNull();
      expect(res.body.data.maxLength).toBeNull();
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ styleGuidelines: 'Some guidelines' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 when name is empty', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 when maxLength is not a positive integer', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', maxLength: -100 })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 when maxLength is zero', async () => {
      const res = await request(app)
        .post('/api/platforms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', maxLength: 0 })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });

  // =====================================
  // PUT /api/platforms/:id - Update Platform
  // =====================================
  describe('PUT /api/platforms/:id', () => {
    it('should update all fields of a platform', async () => {
      const platform = await Platform.create({
        name: 'Original Name',
        styleGuidelines: 'Original Guidelines',
        maxLength: 1000,
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/platforms/${platform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          styleGuidelines: 'Updated Guidelines',
          maxLength: 2000,
        })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Platform updated successfully');
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.styleGuidelines).toBe('Updated Guidelines');
      expect(res.body.data.maxLength).toBe(2000);
    });

    it('should update only specified fields', async () => {
      const platform = await Platform.create({
        name: 'Original Name',
        styleGuidelines: 'Original Guidelines',
        maxLength: 1000,
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/platforms/${platform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.styleGuidelines).toBe('Original Guidelines');
      expect(res.body.data.maxLength).toBe(1000);
    });

    it('should allow updating styleGuidelines to empty string', async () => {
      const platform = await Platform.create({
        name: 'Test',
        styleGuidelines: 'Original guidelines',
        maxLength: 1000,
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/platforms/${platform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ styleGuidelines: '' })
        .expect(200);

      // Note: validator trims the value, empty string is allowed
      expect(res.body.data.styleGuidelines).toBe('');
      expect(res.body.data.maxLength).toBe(1000); // unchanged
    });

    it('should return 404 for non-existent platform', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .put(`/api/platforms/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 when trying to update another user platform', async () => {
      // Create another user and their platform
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherPlatform = await Platform.create({
        name: 'Other Platform',
        userId: otherUser.id,
      });

      const res = await request(app)
        .put(`/api/platforms/${otherPlatform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });
  });

  // =====================================
  // DELETE /api/platforms/:id - Delete Platform
  // =====================================
  describe('DELETE /api/platforms/:id', () => {
    it('should delete a platform', async () => {
      const platform = await Platform.create({
        name: 'To Delete',
        userId: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/platforms/${platform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Platform deleted successfully');

      // Verify it's deleted
      const deleted = await Platform.findByPk(platform.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent platform', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .delete(`/api/platforms/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 when trying to delete another user platform', async () => {
      // Create another user and their platform
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherPlatform = await Platform.create({
        name: 'Other Platform',
        userId: otherUser.id,
      });

      await request(app)
        .delete(`/api/platforms/${otherPlatform.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify it's NOT deleted
      const stillExists = await Platform.findByPk(otherPlatform.id);
      expect(stillExists).not.toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete('/api/platforms/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });
});
