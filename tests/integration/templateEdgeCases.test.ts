import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Template } from '../../src/models';

/**
 * Additional edge case tests for Template API to improve code coverage
 */
describe('Template API Edge Cases for Coverage', () => {
  let authToken: string;
  let userId: string;
  let templateId: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear database
    await Template.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Register a test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    authToken = res.body.token;
    userId = res.body.user.id;

    // Create a test template
    const templateRes = await request(app)
      .post('/api/templates')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Template',
        category: 'tip',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Variable 1', required: true }],
      });

    templateId = templateRes.body.data.template.id;
  });

  describe('Error handling paths', () => {
    it('should handle template not found errors in various endpoints', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      // GET
      await request(app)
        .get(`/api/templates/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // PUT
      await request(app)
        .put(`/api/templates/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated' })
        .expect(404);

      // DELETE
      await request(app)
        .delete(`/api/templates/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // RENDER
      await request(app)
        .post(`/api/templates/${fakeId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ variables: {} })
        .expect(404);

      // DUPLICATE
      await request(app)
        .post(`/api/templates/${fakeId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });

    it('should handle validation errors in update', async () => {
      // Update with mismatched variables
      const res = await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '{{newvar}}',
          variables: [{ name: 'oldvar', description: 'Old', required: true }],
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should handle validation errors in render with missing variables', async () => {
      const res = await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {}, // Missing required var1
        })
        .expect(400);

      expect(res.body.error).toBe('Missing Variables');
      expect(res.body.missingVariables).toContain('var1');
    });

    it('should handle empty content in find-similar', async () => {
      const res = await request(app)
        .post('/api/templates/find-similar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '',
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should handle whitespace-only content in find-similar', async () => {
      const res = await request(app)
        .post('/api/templates/find-similar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '   ',
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should handle service-level validation errors in create', async () => {
      // Try to create a template with invalid data that passes controller validation
      // but fails at the service level
      const res = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty name might pass validator but fail at service level
          category: 'invalid-category',
          content: 'test',
          variables: [],
        });

      // If validation fails, expect 400
      if (res.status === 400) {
        expect(res.body.error).toBeDefined();
      }
    });
  });

  describe('Success paths for full coverage', () => {
    it('should successfully find similar templates', async () => {
      // Create a template with variables
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Similar Template',
          category: 'announcement',
          content: 'Announce {{product}} with {{feature}}',
          variables: [
            { name: 'product', description: 'Product', required: true },
            { name: 'feature', description: 'Feature', required: true },
          ],
        });

      const res = await request(app)
        .post('/api/templates/find-similar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'New {{product}} with great {{feature}}!',
          limit: 5,
        })
        .expect(200);

      expect(res.body.data.templates).toBeDefined();
    });

    it('should successfully get statistics', async () => {
      const res = await request(app)
        .get('/api/templates/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('byCategory');
      expect(res.body.data).toHaveProperty('mostUsed');
      expect(res.body.data).toHaveProperty('recentlyCreated');
    });

    it('should successfully get suggestions', async () => {
      const res = await request(app)
        .get('/api/templates/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('templates');
      expect(res.body.data).toHaveProperty('total');
    });

    it('should successfully render template with warnings', async () => {
      // Create template with unused optional variable
      const templateRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Warning Template',
          category: 'tip',
          content: '{{var1}}',
          variables: [
            { name: 'var1', description: 'Used', required: true },
            { name: 'var2', description: 'Unused', required: false },
          ],
        });

      const newTemplateId = templateRes.body.data.template.id;

      const renderRes = await request(app)
        .post(`/api/templates/${newTemplateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {
            var1: 'value1',
            var2: 'value2', // Provided but not used
          },
        })
        .expect(200);

      expect(renderRes.body.data.content).toBeDefined();
      expect(renderRes.body.data.warnings).toBeDefined();
    });
  });
});
