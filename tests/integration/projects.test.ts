import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Project } from '../../src/models';

describe('Projects API Integration Tests', () => {
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
    await Project.destroy({ where: {}, truncate: true, cascade: true });
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
    it('should create, read, update, and delete a project', async () => {
      // 1. CREATE
      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Edukai',
          description: 'Adaptive learning platform for education',
          audience: 'Educators, students, and institutions',
          keyMessages: ['Innovation', 'Personalization', 'Accessibility'],
        })
        .expect(201);

      expect(createRes.body.data.name).toBe('Edukai');
      const projectId = createRes.body.data.id;

      // 2. READ (single)
      const getOneRes = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getOneRes.body.data.id).toBe(projectId);
      expect(getOneRes.body.data.keyMessages).toEqual([
        'Innovation',
        'Personalization',
        'Accessibility',
      ]);

      // 3. READ (list)
      const getAllRes = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getAllRes.body.count).toBe(1);
      expect(getAllRes.body.data[0].id).toBe(projectId);

      // 4. UPDATE
      const updateRes = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Edukai 2.0',
          keyMessages: ['AI-powered', 'Scalable'],
        })
        .expect(200);

      expect(updateRes.body.data.name).toBe('Edukai 2.0');
      expect(updateRes.body.data.keyMessages).toEqual(['AI-powered', 'Scalable']);
      // Unchanged fields should remain
      expect(updateRes.body.data.audience).toBe('Educators, students, and institutions');

      // 5. DELETE
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 6. Verify deletion
      await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    it('should not allow access to other user projects', async () => {
      // Create project for first user
      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'My Project' })
        .expect(201);

      const projectId = createRes.body.data.id;

      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Second user should NOT see first user's projects
      const listRes = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(listRes.body.count).toBe(0);

      // Second user should NOT access first user's project by ID
      await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT update first user's project
      await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      // Second user should NOT delete first user's project
      await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Verify project still exists for original user
      const verifyRes = await request(app)
        .get(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.data.name).toBe('My Project');
    });
  });

  // =====================================
  // Authentication Tests
  // =====================================
  describe('Authentication Requirements', () => {
    it('should require authentication for all project endpoints', async () => {
      // Create a project first (for testing get/update/delete)
      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test' })
        .expect(201);

      const projectId = createRes.body.data.id;

      // All requests without token should fail
      await request(app).get('/api/projects').expect(401);
      await request(app).get(`/api/projects/${projectId}`).expect(401);
      await request(app).post('/api/projects').send({ name: 'New' }).expect(401);
      await request(app).put(`/api/projects/${projectId}`).send({ name: 'Updated' }).expect(401);
      await request(app).delete(`/api/projects/${projectId}`).expect(401);

      // Invalid token should fail
      await request(app)
        .get('/api/projects')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =====================================
  // Multiple Projects Test
  // =====================================
  describe('Multiple Projects', () => {
    it('should allow user to have multiple projects', async () => {
      // Create multiple projects
      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Edukai' });

      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Trilogie Studio' });

      await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Brandium' });

      const listRes = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listRes.body.count).toBe(3);

      // Should be ordered by createdAt DESC
      expect(listRes.body.data[0].name).toBe('Brandium');
      expect(listRes.body.data[2].name).toBe('Edukai');
    });
  });
});
