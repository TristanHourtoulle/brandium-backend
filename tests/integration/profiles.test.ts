import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile } from '../../src/models';

describe('Profiles API Integration Tests', () => {
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
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
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
    it('should create, read, update, and delete a profile', async () => {
      // 1. CREATE
      const createRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tristan - Freelance Dev',
          bio: 'React & Next.js specialist',
          toneTags: ['professional', 'friendly'],
          doRules: ['Use concrete examples', 'Stay concise'],
          dontRules: ['Avoid jargon', 'No excessive caps'],
        })
        .expect(201);

      expect(createRes.body.data.name).toBe('Tristan - Freelance Dev');
      const profileId = createRes.body.data.id;

      // 2. READ (single)
      const getOneRes = await request(app)
        .get(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getOneRes.body.data.id).toBe(profileId);
      expect(getOneRes.body.data.toneTags).toEqual(['professional', 'friendly']);

      // 3. READ (list)
      const getAllRes = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getAllRes.body.count).toBe(1);
      expect(getAllRes.body.data[0].id).toBe(profileId);

      // 4. UPDATE
      const updateRes = await request(app)
        .put(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tristan - Senior Dev',
          toneTags: ['expert', 'mentor'],
        })
        .expect(200);

      expect(updateRes.body.data.name).toBe('Tristan - Senior Dev');
      expect(updateRes.body.data.toneTags).toEqual(['expert', 'mentor']);
      // Unchanged fields should remain
      expect(updateRes.body.data.bio).toBe('React & Next.js specialist');

      // 5. DELETE
      await request(app)
        .delete(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 6. Verify deletion
      await request(app)
        .get(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    it('should not allow access to other user profiles', async () => {
      // Create profile for first user
      const createRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'My Profile' })
        .expect(201);

      const profileId = createRes.body.data.id;

      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Second user should NOT see first user's profiles
      const listRes = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(listRes.body.count).toBe(0);

      // Second user should NOT access first user's profile by ID
      await request(app)
        .get(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT update first user's profile
      await request(app)
        .put(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      // Second user should NOT delete first user's profile
      await request(app)
        .delete(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Verify profile still exists for original user
      const verifyRes = await request(app)
        .get(`/api/profiles/${profileId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.data.name).toBe('My Profile');
    });
  });

  // =====================================
  // Authentication Tests
  // =====================================
  describe('Authentication Requirements', () => {
    it('should require authentication for all profile endpoints', async () => {
      // Create a profile first (for testing get/update/delete)
      const createRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(201);

      const profileId = createRes.body.data.id;

      // All requests without token should fail
      await request(app).get('/api/profiles').expect(401);
      await request(app).get(`/api/profiles/${profileId}`).expect(401);
      await request(app).post('/api/profiles').send({ name: 'New' }).expect(401);
      await request(app).put(`/api/profiles/${profileId}`).send({ name: 'Updated' }).expect(401);
      await request(app).delete(`/api/profiles/${profileId}`).expect(401);

      // Invalid token should fail
      await request(app)
        .get('/api/profiles')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =====================================
  // Multiple Profiles Test
  // =====================================
  describe('Multiple Profiles', () => {
    it('should allow user to have multiple profiles', async () => {
      // Create multiple profiles
      await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Profile 1 - Professional' });

      await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Profile 2 - Casual' });

      await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Profile 3 - Technical' });

      const listRes = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listRes.body.count).toBe(3);

      // Should be ordered by createdAt DESC
      expect(listRes.body.data[0].name).toBe('Profile 3 - Technical');
      expect(listRes.body.data[2].name).toBe('Profile 1 - Professional');
    });
  });
});
