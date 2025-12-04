import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Post, Profile, Project, Platform } from '../../src/models';

describe('PostController Unit Tests', () => {
  let testUser: User;
  let authToken: string;
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
    // Clean up database in correct order (posts first due to foreign keys)
    await Post.destroy({ where: {}, truncate: true, cascade: true });
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
    await Project.destroy({ where: {}, truncate: true, cascade: true });
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Create a test user and get token
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    testUser = (await User.findOne({ where: { email: 'test@example.com' } })) as User;
    authToken = res.body.token;

    // Create related entities for testing
    testProfile = await Profile.create({
      name: 'Test Profile',
      bio: 'Test Bio',
      toneTags: ['professional'],
      userId: testUser.id,
    });

    testProject = await Project.create({
      name: 'Test Project',
      description: 'Test Description',
      audience: 'Developers',
      userId: testUser.id,
    });

    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
      userId: testUser.id,
    });
  });

  // =====================================
  // GET /api/posts - Get All Posts (Paginated)
  // =====================================
  describe('GET /api/posts', () => {
    it('should return empty array when no posts exist', async () => {
      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toEqual([]);
      expect(res.body).toHaveProperty('pagination');
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return all posts for authenticated user', async () => {
      // Create test posts
      await Post.create({
        rawIdea: 'First post idea',
        generatedText: 'First generated post',
        goal: 'Announce feature',
        userId: testUser.id,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });
      await Post.create({
        rawIdea: 'Second post idea',
        generatedText: 'Second generated post',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.pagination.totalPages).toBe(1);
    });

    it('should include related entities (profile, project, platform)', async () => {
      await Post.create({
        rawIdea: 'Test idea',
        generatedText: 'Generated text',
        userId: testUser.id,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data[0]).toHaveProperty('profile');
      expect(res.body.data[0].profile).toHaveProperty('name', 'Test Profile');
      expect(res.body.data[0]).toHaveProperty('project');
      expect(res.body.data[0].project).toHaveProperty('name', 'Test Project');
      expect(res.body.data[0]).toHaveProperty('platform');
      expect(res.body.data[0].platform).toHaveProperty('name', 'LinkedIn');
    });

    it('should handle posts with null references', async () => {
      await Post.create({
        rawIdea: 'Minimal post',
        generatedText: 'Generated text',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data[0].profile).toBeNull();
      expect(res.body.data[0].project).toBeNull();
      expect(res.body.data[0].platform).toBeNull();
    });

    it('should paginate results correctly', async () => {
      // Create 15 posts
      for (let i = 1; i <= 15; i++) {
        await Post.create({
          rawIdea: `Post idea ${i}`,
          generatedText: `Generated post ${i}`,
          userId: testUser.id,
        });
      }

      // First page
      const res1 = await request(app)
        .get('/api/posts?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res1.body.data).toHaveLength(5);
      expect(res1.body.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 15,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      });

      // Second page
      const res2 = await request(app)
        .get('/api/posts?page=2&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res2.body.data).toHaveLength(5);
      expect(res2.body.pagination.hasNext).toBe(true);
      expect(res2.body.pagination.hasPrev).toBe(true);

      // Last page
      const res3 = await request(app)
        .get('/api/posts?page=3&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res3.body.data).toHaveLength(5);
      expect(res3.body.pagination.hasNext).toBe(false);
      expect(res3.body.pagination.hasPrev).toBe(true);
    });

    it('should order posts by createdAt DESC (newest first)', async () => {
      const post1 = await Post.create({
        rawIdea: 'First post',
        generatedText: 'First generated',
        userId: testUser.id,
      });

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const post2 = await Post.create({
        rawIdea: 'Second post',
        generatedText: 'Second generated',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data[0].id).toBe(post2.id);
      expect(res.body.data[1].id).toBe(post1.id);
    });

    it('should not return posts from other users', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = (await User.findOne({
        where: { email: 'other@example.com' },
      })) as User;

      // Create post for other user
      await Post.create({
        rawIdea: 'Other user post',
        generatedText: 'Other generated',
        userId: otherUser.id,
      });

      // Create post for test user
      await Post.create({
        rawIdea: 'My post',
        generatedText: 'My generated',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.pagination.total).toBe(1);
      expect(res.body.data[0].rawIdea).toBe('My post');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/posts').expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 400 for invalid page parameter', async () => {
      const res = await request(app)
        .get('/api/posts?page=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 for invalid limit parameter', async () => {
      const res = await request(app)
        .get('/api/posts?limit=101')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should use default pagination when not provided', async () => {
      const res = await request(app)
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
    });
  });

  // =====================================
  // GET /api/posts/:id - Get Post By ID
  // =====================================
  describe('GET /api/posts/:id', () => {
    it('should return a post by ID', async () => {
      const post = await Post.create({
        rawIdea: 'Test idea',
        generatedText: 'Generated text',
        goal: 'Test goal',
        userId: testUser.id,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });

      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toBe(post.id);
      expect(res.body.data.rawIdea).toBe('Test idea');
      expect(res.body.data.generatedText).toBe('Generated text');
      expect(res.body.data.goal).toBe('Test goal');
    });

    it('should include full related entities with more details', async () => {
      const post = await Post.create({
        rawIdea: 'Test idea',
        generatedText: 'Generated text',
        userId: testUser.id,
        profileId: testProfile.id,
        projectId: testProject.id,
        platformId: testPlatform.id,
      });

      const res = await request(app)
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Profile should have more fields
      expect(res.body.data.profile).toHaveProperty('name');
      expect(res.body.data.profile).toHaveProperty('bio');
      expect(res.body.data.profile).toHaveProperty('toneTags');

      // Project should have more fields
      expect(res.body.data.project).toHaveProperty('name');
      expect(res.body.data.project).toHaveProperty('description');
      expect(res.body.data.project).toHaveProperty('audience');

      // Platform should have more fields
      expect(res.body.data.platform).toHaveProperty('name');
      expect(res.body.data.platform).toHaveProperty('styleGuidelines');
      expect(res.body.data.platform).toHaveProperty('maxLength');
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
      expect(res.body).toHaveProperty('message', 'Post not found');
    });

    it('should return 404 for post owned by another user', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = (await User.findOne({
        where: { email: 'other@example.com' },
      })) as User;

      // Create post for other user
      const otherPost = await Post.create({
        rawIdea: 'Other user post',
        generatedText: 'Other generated',
        userId: otherUser.id,
      });

      const res = await request(app)
        .get(`/api/posts/${otherPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/posts/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 401 without authentication', async () => {
      const post = await Post.create({
        rawIdea: 'Test',
        generatedText: 'Test',
        userId: testUser.id,
      });

      const res = await request(app).get(`/api/posts/${post.id}`).expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  // =====================================
  // DELETE /api/posts/:id - Delete Post
  // =====================================
  describe('DELETE /api/posts/:id', () => {
    it('should delete a post', async () => {
      const post = await Post.create({
        rawIdea: 'To Delete',
        generatedText: 'Will be deleted',
        userId: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Post deleted successfully');

      // Verify it's deleted
      const deleted = await Post.findByPk(post.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .delete(`/api/posts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 when trying to delete another user post', async () => {
      // Create another user and their post
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = (await User.findOne({
        where: { email: 'other@example.com' },
      })) as User;

      const otherPost = await Post.create({
        rawIdea: 'Other post',
        generatedText: 'Other generated',
        userId: otherUser.id,
      });

      await request(app)
        .delete(`/api/posts/${otherPost.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify it's NOT deleted
      const stillExists = await Post.findByPk(otherPost.id);
      expect(stillExists).not.toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete('/api/posts/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 401 without authentication', async () => {
      const post = await Post.create({
        rawIdea: 'Test',
        generatedText: 'Test',
        userId: testUser.id,
      });

      const res = await request(app).delete(`/api/posts/${post.id}`).expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});
