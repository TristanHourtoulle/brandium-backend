/**
 * Variant Generation Integration Tests
 */

import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Platform } from '../../src/models';
import { llmService } from '../../src/services/LLMService';

// Mock LLMService
jest.mock('../../src/services/LLMService', () => ({
  llmService: {
    generate: jest.fn(),
  },
  RateLimitError: class RateLimitError extends Error {
    retryAfter: number;
    constructor(message: string, retryAfter: number) {
      super(message);
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  },
  LLMServiceError: class LLMServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.name = 'LLMServiceError';
      this.code = code;
    }
  },
}));

const mockGenerate = llmService.generate as jest.Mock;

describe('Variant Generation Integration Tests', () => {
  let testUser: User;
  let authToken: string;
  let testProfile: Profile;
  let testPlatform: Platform;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up
    await Platform.destroy({ where: {}, force: true });
    await Profile.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'variants@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'variants@example.com' } })) as User;
    authToken = res.body.token;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Variant Tester',
      bio: 'Testing variants',
      toneTags: ['professional'],
      userId: testUser.id,
    });

    // Create test platform
    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
      userId: testUser.id,
    });

    mockGenerate.mockReset();
  });

  describe('POST /api/generate (default behavior - single post)', () => {
    it('should generate a single post when variants is not specified', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'This is a single generated post.',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Write about entrepreneurship',
          goal: 'Inspire',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post generated successfully');
      expect(response.body.data).toHaveProperty('postId');
      expect(response.body.data).toHaveProperty('generatedText');
      expect(response.body.data.generatedText).toBe('This is a single generated post.');
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('should generate a single post when variants is 1', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Single post with variants=1',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Write about leadership',
          variants: 1,
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post generated successfully');
      expect(response.body.data).toHaveProperty('postId');
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/generate (multiple variants)', () => {
    it('should generate 2 variants when variants=2', async () => {
      // Mock two different responses
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Direct approach variant',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Storytelling approach variant',
          usage: { promptTokens: 110, completionTokens: 60, totalTokens: 170 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Share insights about remote work',
          goal: 'Educate',
          variants: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('2 post variants generated successfully');
      expect(response.body.data.totalVariants).toBe(2);
      expect(response.body.data.variants).toHaveLength(2);
      expect(mockGenerate).toHaveBeenCalledTimes(2);

      // Check variant structure
      const variants = response.body.data.variants;
      expect(variants[0]).toHaveProperty('postId');
      expect(variants[0]).toHaveProperty('versionId');
      expect(variants[0]).toHaveProperty('generatedText');
      expect(variants[0]).toHaveProperty('approach');
      expect(variants[0]).toHaveProperty('format');
    });

    it('should generate 3 variants when variants=3', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Variant 1',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 2',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 3',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Discuss productivity tips',
          variants: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.totalVariants).toBe(3);
      expect(response.body.data.variants).toHaveLength(3);
      expect(mockGenerate).toHaveBeenCalledTimes(3);
    });

    it('should generate 4 variants when variants=4 (max)', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Variant 1',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 2',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 3',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 4',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Share career advice',
          variants: 4,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.totalVariants).toBe(4);
      expect(response.body.data.variants).toHaveLength(4);
      expect(mockGenerate).toHaveBeenCalledTimes(4);
    });

    it('should use different approaches for each variant', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Direct variant',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Storytelling variant',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Data-driven variant',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Discuss innovation',
          variants: 3,
        });

      expect(response.status).toBe(201);
      const variants = response.body.data.variants;

      // Each variant should have a different approach
      const approaches = variants.map((v: { approach: string }) => v.approach);
      const uniqueApproaches = new Set(approaches);
      expect(uniqueApproaches.size).toBe(3); // All different
    });

    it('should include profile context when generating variants', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Variant 1',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 2',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Talk about growth',
          profileId: testProfile.id,
          variants: 2,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.context.profile).toBeDefined();
      expect(response.body.data.context.profile?.name).toBe('Variant Tester');
    });
  });

  describe('Validation', () => {
    it('should reject variants > 4', async () => {
      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          variants: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject variants < 1', async () => {
      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          variants: 0,
        });

      expect(response.status).toBe(400);
    });

    it('should reject non-integer variants', async () => {
      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          variants: 2.5,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Error handling', () => {
    it('should require authentication', async () => {
      const response = await request(app).post('/api/generate').send({
        rawIdea: 'Test idea',
        variants: 2,
      });

      expect(response.status).toBe(401);
    });

    it('should handle invalid profileId', async () => {
      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          profileId: '00000000-0000-0000-0000-000000000000',
          variants: 2,
        });

      expect(response.status).toBe(404);
    });
  });
});
