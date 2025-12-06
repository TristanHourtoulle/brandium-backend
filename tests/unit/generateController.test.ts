import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Project, Platform, Post } from '../../src/models';
import { llmService } from '../../src/services/LLMService';

// Mock LLMService to avoid real API calls
jest.mock('../../src/services/LLMService', () => {
  const mockGenerate = jest.fn();
  const mockGetRateLimitStatus = jest.fn();
  const mockResetRateLimits = jest.fn();

  return {
    llmService: {
      generate: mockGenerate,
      getRateLimitStatus: mockGetRateLimitStatus,
      resetRateLimits: mockResetRateLimits,
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
  };
});

// Access mocks
const mockGenerate = llmService.generate as jest.Mock;
const mockGetRateLimitStatus = llmService.getRateLimitStatus as jest.Mock;

describe('GenerateController Unit Tests', () => {
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
    // Clean up database
    await Post.destroy({ where: {}, truncate: true, cascade: true });
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
    await Project.destroy({ where: {}, truncate: true, cascade: true });
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'generate@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'generate@example.com' } })) as User;
    authToken = res.body.token;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Test Profile',
      bio: 'A test profile for generation',
      toneTags: ['professional', 'friendly'],
      doRules: ['Be concise', 'Use emojis'],
      dontRules: ['No jargon'],
      userId: testUser.id,
    });

    // Create test project
    testProject = await Project.create({
      name: 'Test Project',
      description: 'A test project',
      audience: 'Developers',
      keyMessages: ['Innovation', 'Quality'],
      userId: testUser.id,
    });

    // Create test platform
    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
      userId: testUser.id,
    });

    // Reset mocks
    jest.clearAllMocks();

    // Default mock response
    mockGenerate.mockResolvedValue({
      text: 'Generated post content!',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  // =====================================
  // POST /api/generate - Generate Post
  // =====================================
  describe('POST /api/generate', () => {
    describe('Success Cases', () => {
      it('should generate a post with only rawIdea', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Just launched a new feature!',
          })
          .expect(201);

        expect(res.body).toHaveProperty('message', 'Post generated successfully');
        expect(res.body.data).toHaveProperty('generatedText', 'Generated post content!');
        expect(res.body.data).toHaveProperty('postId');
        expect(res.body.data).toHaveProperty('usage');
        expect(res.body.data.usage.totalTokens).toBe(150);
      });

      it('should generate a post with all context', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Exciting news about our project!',
            goal: 'Announce feature launch',
            profileId: testProfile.id,
            projectId: testProject.id,
            platformId: testPlatform.id,
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('generatedText');
        expect(res.body.data.context).toEqual({
          profile: { id: testProfile.id, name: 'Test Profile' },
          project: { id: testProject.id, name: 'Test Project' },
          platform: { id: testPlatform.id, name: 'LinkedIn' },
          historicalPostsUsed: 0,
        });
      });

      it('should save post to database', async () => {
        await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea for database save',
            profileId: testProfile.id,
          })
          .expect(201);

        const posts = await Post.findAll({ where: { userId: testUser.id } });
        expect(posts).toHaveLength(1);
        expect(posts[0]!.rawIdea).toBe('Test idea for database save');
        expect(posts[0]!.generatedText).toBe('Generated post content!');
        expect(posts[0]!.profileId).toBe(testProfile.id);
      });

      it('should pass correct prompt to LLM service', async () => {
        await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            goal: 'Test goal',
            profileId: testProfile.id,
          })
          .expect(201);

        expect(mockGenerate).toHaveBeenCalledWith({
          prompt: expect.stringContaining('Test idea'),
        });
        expect(mockGenerate).toHaveBeenCalledWith({
          prompt: expect.stringContaining('Test goal'),
        });
        expect(mockGenerate).toHaveBeenCalledWith({
          prompt: expect.stringContaining('Test Profile'),
        });
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 if rawIdea is missing', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            profileId: testProfile.id,
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 if rawIdea is empty', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: '',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for invalid profileId format', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            profileId: 'not-a-uuid',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for invalid projectId format', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            projectId: 'invalid',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for invalid platformId format', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            platformId: 'invalid',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 if profile not found', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            profileId: '00000000-0000-0000-0000-000000000000',
          })
          .expect(404);

        expect(res.body).toHaveProperty('message', 'Profile not found');
      });

      it('should return 404 if project not found', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            projectId: '00000000-0000-0000-0000-000000000000',
          })
          .expect(404);

        expect(res.body).toHaveProperty('message', 'Project not found');
      });

      it('should return 404 if platform not found', async () => {
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            platformId: '00000000-0000-0000-0000-000000000000',
          })
          .expect(404);

        expect(res.body).toHaveProperty('message', 'Platform not found');
      });

      it('should not allow access to other users resources', async () => {
        // Create another user
        await request(app).post('/api/auth/register').send({
          email: 'other@example.com',
          password: 'Password123',
        });
        const otherUser = (await User.findOne({ where: { email: 'other@example.com' } })) as User;

        // Create profile for other user
        const otherProfile = await Profile.create({
          name: 'Other Profile',
          userId: otherUser.id,
        });

        // Try to use other user's profile
        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
            profileId: otherProfile.id,
          })
          .expect(404);

        expect(res.body).toHaveProperty('message', 'Profile not found');
      });
    });

    describe('Authorization Errors', () => {
      it('should return 401 without auth token', async () => {
        await request(app)
          .post('/api/generate')
          .send({
            rawIdea: 'Test idea',
          })
          .expect(401);
      });
    });

    describe('Rate Limit Errors', () => {
      it('should return 429 when rate limited', async () => {
        const { RateLimitError } = jest.requireMock('../../src/services/LLMService');
        mockGenerate.mockRejectedValueOnce(new RateLimitError('Rate limit exceeded', 30));

        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
          })
          .expect(429);

        expect(res.body).toHaveProperty('error', 'Rate Limit Exceeded');
        expect(res.body).toHaveProperty('retryAfter', 30);
      });
    });

    describe('LLM Service Errors', () => {
      it('should return 503 when API key is missing', async () => {
        const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
        mockGenerate.mockRejectedValueOnce(new LLMServiceError('API key missing', 'API_KEY_MISSING'));

        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
          })
          .expect(503);

        expect(res.body).toHaveProperty('error', 'Generation Error');
        expect(res.body).toHaveProperty('code', 'API_KEY_MISSING');
      });

      it('should return 500 when generation fails', async () => {
        const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
        mockGenerate.mockRejectedValueOnce(new LLMServiceError('Generation failed', 'GENERATION_FAILED'));

        const res = await request(app)
          .post('/api/generate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            rawIdea: 'Test idea',
          })
          .expect(500);

        expect(res.body).toHaveProperty('error', 'Generation Error');
      });
    });
  });

  // =====================================
  // GET /api/generate/status
  // =====================================
  describe('GET /api/generate/status', () => {
    it('should return rate limit status', async () => {
      mockGetRateLimitStatus.mockReturnValue({
        requestsRemaining: 15,
        tokensRemaining: 35000,
        windowResetIn: 45,
      });

      const res = await request(app)
        .get('/api/generate/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveProperty('rateLimit');
      expect(res.body.data.rateLimit.requestsRemaining).toBe(15);
      expect(res.body.data.rateLimit.tokensRemaining).toBe(35000);
      expect(res.body.data).toHaveProperty('service', 'operational');
    });

    it('should require authentication', async () => {
      await request(app).get('/api/generate/status').expect(401);
    });
  });
});
