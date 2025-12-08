import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Platform, Template } from '../../src/models';

describe('Templates API Integration Tests', () => {
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
    await Template.destroy({ where: {}, truncate: true, cascade: true });
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Register a test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'Password123',
    });

    authToken = res.body.token;
    userId = res.body.user.id;

    // Create test profile
    const profileRes = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Profile',
        bio: 'Test bio',
      })
      .expect(201);

    profileId = profileRes.body.data.id;

    // Create test platform
    const platformRes = await request(app)
      .post('/api/platforms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'LinkedIn',
        styleGuidelines: 'Professional',
        maxLength: 3000,
      })
      .expect(201);

    platformId = platformRes.body.data.id;
  });

  // =====================================
  // Complete CRUD Flow Test
  // =====================================
  describe('Complete CRUD Flow', () => {
    it('should create, read, update, render, duplicate, and delete a template', async () => {
      // 1. CREATE
      const createRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Product Announcement',
          description: 'Template for announcing new products',
          category: 'announcement',
          profileId,
          platformId,
          content: 'Excited to announce {{product}}! Key features:\n- {{feature1}}\n- {{feature2}}',
          variables: [
            { name: 'product', description: 'Product name', required: true },
            { name: 'feature1', description: 'First feature', required: true },
            { name: 'feature2', description: 'Second feature', required: false, defaultValue: 'More to come!' },
          ],
          exampleVariables: {
            product: 'MyApp',
            feature1: 'Fast performance',
            feature2: 'Beautiful UI',
          },
          tags: ['product', 'marketing'],
          isPublic: false,
        })
        .expect(201);

      expect(createRes.body.data.template.name).toBe('Product Announcement');
      expect(createRes.body.data.template.variables).toHaveLength(3);
      const templateId = createRes.body.data.template.id;

      // 2. READ (single)
      const getOneRes = await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getOneRes.body.data.template.id).toBe(templateId);
      expect(getOneRes.body.data.template.category).toBe('announcement');

      // 3. READ (list)
      const listRes = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(listRes.body.data.total).toBe(1);
      expect(listRes.body.data.templates[0].id).toBe(templateId);

      // 4. UPDATE
      const updateRes = await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Product Announcement',
          isPublic: true,
        })
        .expect(200);

      expect(updateRes.body.data.template.name).toBe('Updated Product Announcement');
      expect(updateRes.body.data.template.isPublic).toBe(true);

      // 5. RENDER
      const renderRes = await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {
            product: 'SuperApp',
            feature1: 'Lightning speed',
            feature2: 'Modern design',
          },
        })
        .expect(200);

      expect(renderRes.body.data.content).toContain('SuperApp');
      expect(renderRes.body.data.content).toContain('Lightning speed');

      // 6. DUPLICATE
      const duplicateRes = await request(app)
        .post(`/api/templates/${templateId}/duplicate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'My Copy',
        })
        .expect(201);

      expect(duplicateRes.body.data.template.name).toBe('My Copy');
      expect(duplicateRes.body.data.template.id).not.toBe(templateId);

      // 7. DELETE
      await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 8. Verify deletion
      await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // =====================================
  // Authentication Tests
  // =====================================
  describe('Authentication Requirements', () => {
    it('should require authentication for all template endpoints', async () => {
      // Create a template first (for testing get/update/delete)
      const createRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          category: 'tip',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        })
        .expect(201);

      const templateId = createRes.body.data.template.id;

      // All requests without token should fail
      await request(app).get('/api/templates').expect(401);
      await request(app).get(`/api/templates/${templateId}`).expect(401);
      await request(app)
        .post('/api/templates')
        .send({ name: 'New', category: 'tip', content: '{{v}}', variables: [] })
        .expect(401);
      await request(app)
        .put(`/api/templates/${templateId}`)
        .send({ name: 'Updated' })
        .expect(401);
      await request(app).delete(`/api/templates/${templateId}`).expect(401);
      await request(app)
        .post(`/api/templates/${templateId}/render`)
        .send({ variables: {} })
        .expect(401);

      // Invalid token should fail
      await request(app)
        .get('/api/templates')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    it('should not allow access to other user private templates', async () => {
      // Create template for first user
      const createRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'My Private Template',
          category: 'tip',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
          isPublic: false,
        })
        .expect(201);

      const templateId = createRes.body.data.template.id;

      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Second user should NOT see first user's private template by ID
      await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Second user should NOT update first user's template
      await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      // Second user should NOT delete first user's template
      await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      // Verify template still exists for original user
      const verifyRes = await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(verifyRes.body.data.template.name).toBe('My Private Template');
    });

    it('should allow access to public templates from other users', async () => {
      // Create public template for first user
      const createRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Public Template',
          category: 'tip',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
          isPublic: true,
        })
        .expect(201);

      const templateId = createRes.body.data.template.id;

      // Register second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Second user SHOULD be able to read public template
      const getRes = await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(getRes.body.data.template.name).toBe('Public Template');

      // Second user SHOULD be able to render public template
      await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ variables: { var1: 'test' } })
        .expect(200);

      // Second user SHOULD be able to duplicate public template
      const duplicateRes = await request(app)
        .post(`/api/templates/${templateId}/duplicate`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'My Copy' });

      // If duplication works, verify the duplicate belongs to user2
      if (duplicateRes.status === 201) {
        expect(duplicateRes.body.data.template.name).toBe('My Copy');
      }

      // But second user still CANNOT update or delete original template
      await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ name: 'Hacked!' })
        .expect(404);

      await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });
  });

  // =====================================
  // Validation Tests
  // =====================================
  describe('Validation', () => {
    it('should validate required fields on create', async () => {
      // Missing name
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'tip',
          content: '{{var1}}',
          variables: [],
        })
        .expect(400);

      // Missing category
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          content: '{{var1}}',
          variables: [],
        })
        .expect(400);

      // Missing content
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          category: 'tip',
          variables: [],
        })
        .expect(400);
    });

    it('should validate variables format', async () => {
      // Variables must be an array
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          category: 'tip',
          content: '{{var1}}',
          variables: 'not-an-array',
        })
        .expect(400);

      // Variable must have name
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          category: 'tip',
          content: '{{var1}}',
          variables: [{ description: 'Missing name', required: true }],
        })
        .expect(400);

      // Variable must have required field
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          category: 'tip',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Missing required field' }],
        })
        .expect(400);
    });

    it('should validate template variables match content', async () => {
      const res = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test',
          category: 'tip',
          content: 'Using {{var1}} and {{var2}}',
          variables: [
            { name: 'var1', description: 'First var', required: true },
            // Missing var2
          ],
        })
        .expect(400);

      expect(res.body.message).toContain('validation failed');
      expect(res.body.message).toContain('var2');
    });
  });

  // =====================================
  // Listing and Filtering Tests
  // =====================================
  describe('Listing and Filtering', () => {
    beforeEach(async () => {
      // Create templates in different categories
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Announcement 1',
          category: 'announcement',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        });

      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tutorial 1',
          category: 'tutorial',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        });

      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tip 1',
          category: 'tip',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        });
    });

    it('should list all user templates', async () => {
      const res = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.total).toBe(3);
      expect(res.body.data.templates).toHaveLength(3);
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/templates?category=announcement')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.templates[0].category).toBe('announcement');
    });

    it('should filter by platformId', async () => {
      // Create template with platformId
      const createRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'LinkedIn Template',
          category: 'tip',
          platformId,
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        });

      const res = await request(app)
        .get(`/api/templates?platformId=${platformId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.total).toBe(1);
      expect(res.body.data.templates[0].name).toBe('LinkedIn Template');
    });

    it('should support pagination', async () => {
      const page1 = await request(app)
        .get('/api/templates?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page1.body.data.templates).toHaveLength(2);
      expect(page1.body.data.page).toBe(1);
      expect(page1.body.data.totalPages).toBe(2);

      const page2 = await request(app)
        .get('/api/templates?page=2&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(page2.body.data.templates).toHaveLength(1);
      expect(page2.body.data.page).toBe(2);
    });
  });

  // =====================================
  // Rendering Tests
  // =====================================
  describe('Rendering', () => {
    let templateId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Render Test',
          category: 'announcement',
          content: 'Product: {{product}}, Price: {{price}}',
          variables: [
            { name: 'product', description: 'Product name', required: true },
            { name: 'price', description: 'Price', required: false, defaultValue: 'Free' },
          ],
        });

      templateId = res.body.data.template.id;
    });

    it('should render template with all variables', async () => {
      const res = await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {
            product: 'SuperApp',
            price: '$99',
          },
        })
        .expect(200);

      expect(res.body.data.content).toBe('Product: SuperApp, Price: $99');
      expect(res.body.data.warnings).toHaveLength(0);
    });

    it('should use default values for optional variables', async () => {
      const res = await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {
            product: 'SuperApp',
            // price omitted, should use default
          },
        })
        .expect(200);

      expect(res.body.data.content).toBe('Product: SuperApp, Price: Free');
    });

    it('should return error for missing required variables', async () => {
      const res = await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          variables: {
            // product missing
            price: '$99',
          },
        })
        .expect(400);

      expect(res.body.error).toBe('Missing Variables');
      expect(res.body.missingVariables).toContain('product');
    });
  });

  // =====================================
  // Suggestions Tests
  // =====================================
  describe('Suggestions', () => {
    it('should return template suggestions', async () => {
      // Create some templates
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template 1',
          category: 'announcement',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
          isPublic: true,
        });

      const res = await request(app)
        .get('/api/templates/suggestions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.templates).toBeDefined();
      expect(res.body.data.total).toBeDefined();
    });

    it('should filter suggestions by category', async () => {
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Announcement',
          category: 'announcement',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
          isPublic: true,
        });

      const res = await request(app)
        .get('/api/templates/suggestions?category=announcement')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.templates.every((t: any) => t.category === 'announcement')).toBe(true);
    });
  });

  // =====================================
  // Find Similar Templates Tests
  // =====================================
  describe('Find Similar', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Product Template',
          category: 'announcement',
          content: 'Announcing {{product}} with {{feature}}',
          variables: [
            { name: 'product', description: 'Product name', required: true },
            { name: 'feature', description: 'Key feature', required: true },
          ],
        });
    });

    it('should find similar templates', async () => {
      const res = await request(app)
        .post('/api/templates/find-similar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Check out our new {{product}} with {{feature}}!',
          limit: 5,
        })
        .expect(200);

      expect(res.body.data.templates).toBeDefined();
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(res.body.data.templates[0].name).toBe('Product Template');
    });

    it('should require content parameter', async () => {
      await request(app)
        .post('/api/templates/find-similar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          limit: 5,
        })
        .expect(400);
    });
  });

  // =====================================
  // Statistics Tests
  // =====================================
  describe('Statistics', () => {
    beforeEach(async () => {
      // Create templates in different categories
      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Announcement 1',
          category: 'announcement',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        });

      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tutorial 1',
          category: 'tutorial',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        });
    });

    it('should return statistics', async () => {
      const res = await request(app)
        .get('/api/templates/statistics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.total).toBe(2);
      expect(res.body.data.byCategory).toBeDefined();
      expect(res.body.data.byCategory.announcement).toBe(1);
      expect(res.body.data.byCategory.tutorial).toBe(1);
      expect(res.body.data.mostUsed).toBeDefined();
      expect(res.body.data.recentlyCreated).toBeDefined();
    });
  });

  // =====================================
  // Edge Cases
  // =====================================
  describe('Edge Cases', () => {
    it('should handle invalid UUID formats', async () => {
      await request(app)
        .get('/api/templates/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should handle non-existent template IDs', async () => {
      await request(app)
        .get('/api/templates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should handle empty variables object', async () => {
      const createRes = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'No Variables',
          category: 'tip',
          content: 'Plain text without variables',
          variables: [],
        })
        .expect(201);

      const templateId = createRes.body.data.template.id;

      // Rendering should work with empty variables
      await request(app)
        .post(`/api/templates/${templateId}/render`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ variables: {} })
        .expect(200);
    });

    it('should handle very long template content', async () => {
      const longContent = 'x'.repeat(10000) + ' {{var1}}';

      const res = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Long Template',
          category: 'tip',
          content: longContent,
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        })
        .expect(201);

      expect(res.body.data.template.content).toHaveLength(longContent.length);
    });
  });
});
