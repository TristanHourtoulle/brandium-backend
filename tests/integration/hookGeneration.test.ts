/**
 * Hook Generation Integration Tests
 */

import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile } from '../../src/models';
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

describe('Hook Generation Integration Tests', () => {
  let testUser: User;
  let authToken: string;
  let testProfile: Profile;

  const mockHooksResponse = `
[TYPE: question]
[HOOK: Ever wonder why most startups fail in the first year?]
[ENGAGEMENT: 9]
---
[TYPE: stat]
[HOOK: 83% of entrepreneurs say their biggest mistake was waiting too long.]
[ENGAGEMENT: 8]
---
[TYPE: story]
[HOOK: Three months ago, I almost gave up on my business...]
[ENGAGEMENT: 9]
---
[TYPE: bold_opinion]
[HOOK: Stop following your passion. Follow the money instead.]
[ENGAGEMENT: 8]
---
`;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up
    await Profile.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'hooks@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'hooks@example.com' } })) as User;
    authToken = res.body.token;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Test Creator',
      bio: 'Content creator',
      toneTags: ['professional', 'engaging'],
      userId: testUser.id,
    });

    mockGenerate.mockReset();
  });

  describe('POST /api/generate/hooks', () => {
    it('should generate hooks successfully', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: mockHooksResponse,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
      });

      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Share lessons about entrepreneurship',
          goal: 'Inspire and educate',
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Hooks generated successfully');
      expect(response.body.data.hooks).toHaveLength(4);
      expect(response.body.data.totalHooks).toBe(4);

      const hooks = response.body.data.hooks;
      expect(hooks[0]?.type).toBe('question');
      expect(hooks[1]?.type).toBe('stat');
      expect(hooks[2]?.type).toBe('story');
      expect(hooks[3]?.type).toBe('bold_opinion');
      expect(hooks[0]?.text).toContain('startups fail');
      expect(hooks[0]?.estimatedEngagement).toBeGreaterThan(0);
    });

    it('should generate hooks with profile context', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: mockHooksResponse,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
      });

      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Talk about growth strategies',
          profileId: testProfile.id,
        });

      expect(response.status).toBe(200);
      expect(mockGenerate).toHaveBeenCalled();

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Test Creator');
    });

    it('should support custom count parameter', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: mockHooksResponse,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
      });

      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          count: 3,
        });

      expect(response.status).toBe(200);
    });

    it('should reject request without rawIdea', async () => {
      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      // Validator returns details array, controller returns message
      expect(response.body.details || response.body.message).toBeDefined();
    });

    it('should reject request with empty rawIdea', async () => {
      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: '' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject request with whitespace-only rawIdea', async () => {
      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid count', async () => {
      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          count: 15, // Max is 10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      // Validator returns details array, controller returns message
      expect(response.body.details || response.body.message).toBeDefined();
    });

    it('should reject count less than 1', async () => {
      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          count: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('should reject invalid profileId', async () => {
      const response = await request(app)
        .post('/api/generate/hooks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
          profileId: '00000000-0000-0000-0000-000000000000',
        });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/generate/hooks')
        .send({
          rawIdea: 'Test idea',
        });

      expect(response.status).toBe(401);
    });
  });
});
