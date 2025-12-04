import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile } from '../../src/models';

describe('ProfileController Unit Tests', () => {
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
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
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
  // GET /api/profiles - Get All Profiles
  // =====================================
  describe('GET /api/profiles', () => {
    it('should return empty array when no profiles exist', async () => {
      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 0);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toEqual([]);
    });

    it('should return all profiles for authenticated user', async () => {
      // Create test profiles
      await Profile.create({
        name: 'Profile 1',
        bio: 'Bio 1',
        toneTags: ['professional'],
        doRules: ['Be clear'],
        dontRules: ['No jargon'],
        userId: testUser.id,
      });
      await Profile.create({
        name: 'Profile 2',
        bio: 'Bio 2',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 2);
      expect(res.body.data).toHaveLength(2);
    });

    it('should not return profiles from other users', async () => {
      // Create another user
      const otherUserRes = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      // Create profile for other user
      await Profile.create({
        name: 'Other User Profile',
        userId: otherUser.id,
      });

      // Create profile for test user
      await Profile.create({
        name: 'My Profile',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 1);
      expect(res.body.data[0].name).toBe('My Profile');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/profiles').expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  // =====================================
  // GET /api/profiles/:id - Get Profile By ID
  // =====================================
  describe('GET /api/profiles/:id', () => {
    it('should return a profile by ID', async () => {
      const profile = await Profile.create({
        name: 'Test Profile',
        bio: 'Test Bio',
        toneTags: ['casual'],
        doRules: ['Use emojis'],
        dontRules: ['No caps'],
        userId: testUser.id,
      });

      const res = await request(app)
        .get(`/api/profiles/${profile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe('Test Profile');
      expect(res.body.data.bio).toBe('Test Bio');
      expect(res.body.data.toneTags).toEqual(['casual']);
    });

    it('should return 404 for non-existent profile', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/api/profiles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
      expect(res.body).toHaveProperty('message', 'Profile not found');
    });

    it('should return 404 for profile owned by another user', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      // Create profile for other user
      const otherProfile = await Profile.create({
        name: 'Other Profile',
        userId: otherUser.id,
      });

      const res = await request(app)
        .get(`/api/profiles/${otherProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/profiles/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });

  // =====================================
  // POST /api/profiles - Create Profile
  // =====================================
  describe('POST /api/profiles', () => {
    it('should create a new profile with all fields', async () => {
      const profileData = {
        name: 'New Profile',
        bio: 'My new bio',
        toneTags: ['professional', 'friendly'],
        doRules: ['Be concise', 'Use examples'],
        dontRules: ['Avoid jargon', 'No caps lock'],
      };

      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send(profileData)
        .expect(201);

      expect(res.body).toHaveProperty('message', 'Profile created successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe('New Profile');
      expect(res.body.data.bio).toBe('My new bio');
      expect(res.body.data.toneTags).toEqual(['professional', 'friendly']);
      expect(res.body.data.userId).toBe(testUser.id);
    });

    it('should create a profile with only required fields', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Minimal Profile' })
        .expect(201);

      expect(res.body.data.name).toBe('Minimal Profile');
      expect(res.body.data.bio).toBeNull();
      expect(res.body.data.toneTags).toEqual([]);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ bio: 'Bio without name' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 when name is empty', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 when toneTags is not an array', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', toneTags: 'not-an-array' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });

  // =====================================
  // PUT /api/profiles/:id - Update Profile
  // =====================================
  describe('PUT /api/profiles/:id', () => {
    it('should update all fields of a profile', async () => {
      const profile = await Profile.create({
        name: 'Original Name',
        bio: 'Original Bio',
        toneTags: ['original'],
        doRules: ['original rule'],
        dontRules: ['original dont'],
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/profiles/${profile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          bio: 'Updated Bio',
          toneTags: ['updated'],
          doRules: ['updated rule'],
          dontRules: ['updated dont'],
        })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Profile updated successfully');
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.bio).toBe('Updated Bio');
      expect(res.body.data.toneTags).toEqual(['updated']);
    });

    it('should update only specified fields', async () => {
      const profile = await Profile.create({
        name: 'Original Name',
        bio: 'Original Bio',
        toneTags: ['original'],
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/profiles/${profile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.bio).toBe('Original Bio');
      expect(res.body.data.toneTags).toEqual(['original']);
    });

    it('should allow setting bio to empty string', async () => {
      const profile = await Profile.create({
        name: 'Test',
        bio: 'Original Bio',
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/profiles/${profile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ bio: '' })
        .expect(200);

      // Note: validator trims the value, empty string is allowed
      expect(res.body.data.bio).toBe('');
    });

    it('should return 404 for non-existent profile', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .put(`/api/profiles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 when trying to update another user profile', async () => {
      // Create another user and their profile
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherProfile = await Profile.create({
        name: 'Other Profile',
        userId: otherUser.id,
      });

      const res = await request(app)
        .put(`/api/profiles/${otherProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });
  });

  // =====================================
  // DELETE /api/profiles/:id - Delete Profile
  // =====================================
  describe('DELETE /api/profiles/:id', () => {
    it('should delete a profile', async () => {
      const profile = await Profile.create({
        name: 'To Delete',
        userId: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/profiles/${profile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Profile deleted successfully');

      // Verify it's deleted
      const deleted = await Profile.findByPk(profile.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent profile', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .delete(`/api/profiles/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 when trying to delete another user profile', async () => {
      // Create another user and their profile
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherProfile = await Profile.create({
        name: 'Other Profile',
        userId: otherUser.id,
      });

      await request(app)
        .delete(`/api/profiles/${otherProfile.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify it's NOT deleted
      const stillExists = await Profile.findByPk(otherProfile.id);
      expect(stillExists).not.toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete('/api/profiles/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });
});
