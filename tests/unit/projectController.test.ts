import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Project } from '../../src/models';

describe('ProjectController Unit Tests', () => {
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
    await Project.destroy({ where: {}, truncate: true, cascade: true });
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
  // GET /api/projects - Get All Projects
  // =====================================
  describe('GET /api/projects', () => {
    it('should return empty array when no projects exist', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 0);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toEqual([]);
    });

    it('should return all projects for authenticated user', async () => {
      await Project.create({
        name: 'Edukai',
        description: 'Educational platform',
        audience: 'Students and educators',
        keyMessages: ['Innovation', 'Accessibility'],
        userId: testUser.id,
      });
      await Project.create({
        name: 'Trilogie Studio',
        description: 'Design studio',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 2);
      expect(res.body.data).toHaveLength(2);
    });

    it('should not return projects from other users', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      // Create project for other user
      await Project.create({
        name: 'Other Project',
        userId: otherUser.id,
      });

      // Create project for test user
      await Project.create({
        name: 'My Project',
        userId: testUser.id,
      });

      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('count', 1);
      expect(res.body.data[0].name).toBe('My Project');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/projects').expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
    });
  });

  // =====================================
  // GET /api/projects/:id - Get Project By ID
  // =====================================
  describe('GET /api/projects/:id', () => {
    it('should return a project by ID', async () => {
      const project = await Project.create({
        name: 'Edukai',
        description: 'Educational platform for adaptive learning',
        audience: 'Educators and students',
        keyMessages: ['Innovation', 'Personalization', 'Accessibility'],
        userId: testUser.id,
      });

      const res = await request(app)
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe('Edukai');
      expect(res.body.data.description).toBe('Educational platform for adaptive learning');
      expect(res.body.data.keyMessages).toEqual(['Innovation', 'Personalization', 'Accessibility']);
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .get(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
      expect(res.body).toHaveProperty('message', 'Project not found');
    });

    it('should return 404 for project owned by another user', async () => {
      // Create another user
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherProject = await Project.create({
        name: 'Other Project',
        userId: otherUser.id,
      });

      const res = await request(app)
        .get(`/api/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/projects/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });

  // =====================================
  // POST /api/projects - Create Project
  // =====================================
  describe('POST /api/projects', () => {
    it('should create a new project with all fields', async () => {
      const projectData = {
        name: 'New Project',
        description: 'A new exciting project',
        audience: 'Developers and designers',
        keyMessages: ['Innovation', 'Quality', 'Speed'],
      };

      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(res.body).toHaveProperty('message', 'Project created successfully');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.name).toBe('New Project');
      expect(res.body.data.description).toBe('A new exciting project');
      expect(res.body.data.keyMessages).toEqual(['Innovation', 'Quality', 'Speed']);
      expect(res.body.data.userId).toBe(testUser.id);
    });

    it('should create a project with only required fields', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Minimal Project' })
        .expect(201);

      expect(res.body.data.name).toBe('Minimal Project');
      expect(res.body.data.description).toBeNull();
      expect(res.body.data.audience).toBeNull();
      expect(res.body.data.keyMessages).toEqual([]);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: 'Project without name' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 when name is empty', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });

    it('should return 400 when keyMessages is not an array', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test', keyMessages: 'not-an-array' })
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });

  // =====================================
  // PUT /api/projects/:id - Update Project
  // =====================================
  describe('PUT /api/projects/:id', () => {
    it('should update all fields of a project', async () => {
      const project = await Project.create({
        name: 'Original Name',
        description: 'Original Description',
        audience: 'Original Audience',
        keyMessages: ['original'],
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated Description',
          audience: 'Updated Audience',
          keyMessages: ['updated', 'messages'],
        })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Project updated successfully');
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.description).toBe('Updated Description');
      expect(res.body.data.audience).toBe('Updated Audience');
      expect(res.body.data.keyMessages).toEqual(['updated', 'messages']);
    });

    it('should update only specified fields', async () => {
      const project = await Project.create({
        name: 'Original Name',
        description: 'Original Description',
        audience: 'Original Audience',
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.description).toBe('Original Description');
      expect(res.body.data.audience).toBe('Original Audience');
    });

    it('should allow setting description to empty string', async () => {
      const project = await Project.create({
        name: 'Test',
        description: 'Original Description',
        userId: testUser.id,
      });

      const res = await request(app)
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ description: '' })
        .expect(200);

      // Note: validator trims the value, empty string is allowed
      expect(res.body.data.description).toBe('');
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .put(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 when trying to update another user project', async () => {
      // Create another user and their project
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherProject = await Project.create({
        name: 'Other Project',
        userId: otherUser.id,
      });

      const res = await request(app)
        .put(`/api/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });
  });

  // =====================================
  // DELETE /api/projects/:id - Delete Project
  // =====================================
  describe('DELETE /api/projects/:id', () => {
    it('should delete a project', async () => {
      const project = await Project.create({
        name: 'To Delete',
        userId: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Project deleted successfully');

      // Verify it's deleted
      const deleted = await Project.findByPk(project.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const res = await request(app)
        .delete(`/api/projects/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('error', 'Not Found');
    });

    it('should return 404 when trying to delete another user project', async () => {
      // Create another user and their project
      await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = await User.findOne({ where: { email: 'other@example.com' } }) as User;

      const otherProject = await Project.create({
        name: 'Other Project',
        userId: otherUser.id,
      });

      await request(app)
        .delete(`/api/projects/${otherProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify it's NOT deleted
      const stillExists = await Project.findByPk(otherProject.id);
      expect(stillExists).not.toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .delete('/api/projects/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('error', 'Validation Error');
    });
  });
});
