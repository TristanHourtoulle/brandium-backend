import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Project, Platform, Post, Template } from '../../src/models';
import { llmService } from '../../src/services/LLMService';

// Mock LLMService to avoid real API calls and token consumption
jest.mock('../../src/services/LLMService', () => {
  const mockGenerate = jest.fn();
  const mockGetRateLimitStatus = jest.fn();
  const mockResetRateLimits = jest.fn();
  const mockSetRateLimitConfig = jest.fn();

  return {
    llmService: {
      generate: mockGenerate,
      getRateLimitStatus: mockGetRateLimitStatus,
      resetRateLimits: mockResetRateLimits,
      setRateLimitConfig: mockSetRateLimitConfig,
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

const mockGenerate = llmService.generate as jest.Mock;
const mockGetRateLimitStatus = llmService.getRateLimitStatus as jest.Mock;

describe('Generate API Integration Tests', () => {
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
    // Clean up
    await Post.destroy({ where: {}, truncate: true, cascade: true });
    await Template.destroy({ where: {}, truncate: true, cascade: true });
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
    await Project.destroy({ where: {}, truncate: true, cascade: true });
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'integration@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'integration@example.com' } })) as User;
    authToken = res.body.token;

    // Create test entities
    testProfile = await Profile.create({
      name: 'Integration Test Profile',
      bio: 'Expert in software development',
      toneTags: ['professional', 'engaging'],
      doRules: ['Use clear language', 'Include a CTA'],
      dontRules: ['No buzzwords', 'No clickbait'],
      userId: testUser.id,
    });

    testProject = await Project.create({
      name: 'Edukai',
      description: 'AI-powered learning platform',
      audience: 'Students and lifelong learners',
      keyMessages: ['Personalized learning', 'AI tutoring'],
      userId: testUser.id,
    });

    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone, use hashtags, engage with questions',
      maxLength: 3000,
      userId: testUser.id,
    });

    // Reset mocks
    jest.clearAllMocks();

    // Default mock
    mockGenerate.mockResolvedValue({
      text: 'This is a professionally crafted LinkedIn post about our latest feature launch!',
      usage: {
        promptTokens: 250,
        completionTokens: 100,
        totalTokens: 350,
      },
    });

    mockGetRateLimitStatus.mockReturnValue({
      requestsRemaining: 18,
      tokensRemaining: 39500,
      windowResetIn: 55,
    });
  });

  // =====================================
  // Full Integration Flow
  // =====================================
  describe('Complete Generation Flow', () => {
    it('should generate a post with full context and save to database', async () => {
      const res = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: testProfile.id,
          projectId: testProject.id,
          platformId: testPlatform.id,
          goal: 'Announce new AI tutoring feature',
          rawIdea: 'We just launched personalized AI tutoring in Edukai! Students can now get 1-on-1 help anytime.',
        })
        .expect(201);

      // Verify response structure
      expect(res.body).toHaveProperty('message', 'Post generated successfully');
      expect(res.body.data).toHaveProperty('postId');
      expect(res.body.data).toHaveProperty('generatedText');
      expect(res.body.data).toHaveProperty('usage');

      // Verify context info in response
      expect(res.body.data.context.profile.name).toBe('Integration Test Profile');
      expect(res.body.data.context.project.name).toBe('Edukai');
      expect(res.body.data.context.platform.name).toBe('LinkedIn');

      // Verify post saved to database
      const savedPost = await Post.findByPk(res.body.data.postId);
      expect(savedPost).not.toBeNull();
      expect(savedPost?.rawIdea).toContain('AI tutoring');
      expect(savedPost?.generatedText).toBeTruthy();
      expect(savedPost?.userId).toBe(testUser.id);
      expect(savedPost?.profileId).toBe(testProfile.id);
      expect(savedPost?.projectId).toBe(testProject.id);
      expect(savedPost?.platformId).toBe(testPlatform.id);
    });

    it('should generate multiple posts sequentially', async () => {
      // First post
      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'First post idea' })
        .expect(201);

      // Second post
      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Second post idea' })
        .expect(201);

      // Verify both posts saved
      const posts = await Post.findAll({ where: { userId: testUser.id } });
      expect(posts).toHaveLength(2);
    });

    it('should generate with partial context (only profile)', async () => {
      const res = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: testProfile.id,
          rawIdea: 'Testing partial context generation',
        })
        .expect(201);

      expect(res.body.data.context.profile).not.toBeNull();
      expect(res.body.data.context.project).toBeNull();
      expect(res.body.data.context.platform).toBeNull();
    });

    it('should generate with partial context (only platform)', async () => {
      const res = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platformId: testPlatform.id,
          rawIdea: 'Testing platform-only context',
        })
        .expect(201);

      expect(res.body.data.context.platform).not.toBeNull();
      expect(res.body.data.context.profile).toBeNull();
      expect(res.body.data.context.project).toBeNull();
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    let otherUser: User;
    let otherToken: string;
    let otherProfile: Profile;

    beforeEach(async () => {
      const res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      otherUser = (await User.findOne({ where: { email: 'other@example.com' } })) as User;
      otherToken = res.body.token;

      otherProfile = await Profile.create({
        name: 'Other User Profile',
        userId: otherUser.id,
      });
    });

    it('should not access other user profile for generation', async () => {
      const res = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: otherProfile.id,
          rawIdea: 'Trying to use other profile',
        })
        .expect(404);

      expect(res.body.message).toBe('Profile not found');
    });

    it('should not see other user posts in database', async () => {
      // Create post for other user
      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ rawIdea: 'Other user post' })
        .expect(201);

      // Check posts for original user
      const posts = await Post.findAll({ where: { userId: testUser.id } });
      expect(posts).toHaveLength(0);
    });
  });

  // =====================================
  // Status Endpoint Tests
  // =====================================
  describe('GET /api/generate/status', () => {
    it('should return current rate limit status', async () => {
      const res = await request(app)
        .get('/api/generate/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.rateLimit).toEqual({
        requestsRemaining: 18,
        tokensRemaining: 39500,
        windowResetIn: 55,
      });
      expect(res.body.data.service).toBe('operational');
    });
  });

  // =====================================
  // Error Scenarios
  // =====================================
  describe('Error Scenarios', () => {
    it('should handle rate limit gracefully', async () => {
      const { RateLimitError } = jest.requireMock('../../src/services/LLMService');
      mockGenerate.mockRejectedValueOnce(new RateLimitError('Too many requests', 45));

      const res = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Test rate limit' })
        .expect(429);

      expect(res.body.retryAfter).toBe(45);
    });

    it('should handle service unavailable', async () => {
      const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
      mockGenerate.mockRejectedValueOnce(new LLMServiceError('Service down', 'SERVICE_UNAVAILABLE'));

      const res = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Test service error' })
        .expect(503);

      expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should not save post when generation fails', async () => {
      const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
      mockGenerate.mockRejectedValueOnce(new LLMServiceError('Failed', 'GENERATION_FAILED'));

      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Should not be saved' })
        .expect(500);

      const posts = await Post.findAll({ where: { userId: testUser.id } });
      expect(posts).toHaveLength(0);
    });
  });

  // =====================================
  // Prompt Construction Verification
  // =====================================
  describe('Prompt Construction', () => {
    it('should include profile data in prompt', async () => {
      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: testProfile.id,
          rawIdea: 'Test prompt construction',
        })
        .expect(201);

      const calledPrompt = mockGenerate.mock.calls[0][0].prompt;
      expect(calledPrompt).toContain('Integration Test Profile');
      expect(calledPrompt).toContain('Expert in software development');
      expect(calledPrompt).toContain('professional');
      expect(calledPrompt).toContain('Use clear language');
    });

    it('should include project data in prompt', async () => {
      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProject.id,
          rawIdea: 'Test project context',
        })
        .expect(201);

      const calledPrompt = mockGenerate.mock.calls[0][0].prompt;
      expect(calledPrompt).toContain('Edukai');
      expect(calledPrompt).toContain('AI-powered learning platform');
      expect(calledPrompt).toContain('Students and lifelong learners');
    });

    it('should include platform constraints in prompt', async () => {
      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          platformId: testPlatform.id,
          rawIdea: 'Test platform constraints',
        })
        .expect(201);

      const calledPrompt = mockGenerate.mock.calls[0][0].prompt;
      expect(calledPrompt).toContain('LinkedIn');
      expect(calledPrompt).toContain('3000 characters');
    });

    it('should include goal in prompt', async () => {
      await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          goal: 'Drive engagement and signups',
          rawIdea: 'Test goal inclusion',
        })
        .expect(201);

      const calledPrompt = mockGenerate.mock.calls[0][0].prompt;
      expect(calledPrompt).toContain('Drive engagement and signups');
    });
  });

  // =====================================
  // Generate from Template Tests
  // =====================================
  describe('Generate from Template', () => {
    let testTemplate: Template;

    beforeEach(async () => {
      // Create a test template
      testTemplate = await Template.create({
        userId: testUser.id,
        profileId: testProfile.id,
        platformId: testPlatform.id,
        name: 'Product Announcement Template',
        description: 'Template for announcing products',
        category: 'announcement',
        content:
          'Excited to announce {{product}}! 🚀\n\n{{description}}\n\nKey features:\n- {{feature1}}\n- {{feature2}}\n\n{{cta}}',
        variables: [
          { name: 'product', description: 'Product name', required: true },
          { name: 'description', description: 'Product description', required: true },
          { name: 'feature1', description: 'First feature', required: true },
          { name: 'feature2', description: 'Second feature', required: false, defaultValue: 'More to come!' },
          { name: 'cta', description: 'Call to action', required: false, defaultValue: 'Learn more!' },
        ],
        isSystem: false,
        isPublic: false,
        usageCount: 0,
      });
    });

    it('should generate post from template with all variables', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'SuperApp',
            description: 'The ultimate productivity tool for modern teams',
            feature1: 'AI-powered automation',
            feature2: 'Real-time collaboration',
            cta: 'Try it free today!',
          },
          profileId: testProfile.id,
          platformId: testPlatform.id,
          goal: 'Drive signups',
        })
        .expect(201);

      expect(res.body.message).toBe('Post generated from template successfully');
      expect(res.body.data).toHaveProperty('postId');
      expect(res.body.data).toHaveProperty('generatedText');
      expect(res.body.data.template.id).toBe(testTemplate.id);
      expect(res.body.data.template.name).toBe('Product Announcement Template');

      // Verify LLM was called with rendered content
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('SuperApp'),
        }),
      );
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('AI-powered automation'),
        }),
      );

      // Verify post saved to database
      const savedPost = await Post.findByPk(res.body.data.postId);
      expect(savedPost).not.toBeNull();
      expect(savedPost?.rawIdea).toContain('SuperApp');
    });

    it('should use default values for optional variables', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'QuickTool',
            description: 'A simple yet powerful tool',
            feature1: 'Fast and lightweight',
            // feature2 and cta omitted - should use defaults
          },
          profileId: testProfile.id,
          platformId: testPlatform.id,
        })
        .expect(201);

      expect(res.body.data.postId).toBeDefined();

      // Verify template was incremented
      await testTemplate.reload();
      expect(testTemplate.usageCount).toBe(1);
    });

    it('should return error for missing required variables', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'MyApp',
            // Missing required 'description' and 'feature1'
          },
        })
        .expect(400);

      expect(res.body.error).toBe('Missing Variables');
      expect(res.body.missingVariables).toContain('description');
      expect(res.body.missingVariables).toContain('feature1');

      // Verify no post was created
      const posts = await Post.findAll({ where: { userId: testUser.id } });
      expect(posts).toHaveLength(0);
    });

    it('should work without optional context (profile, platform)', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'SimpleApp',
            description: 'Simple description',
            feature1: 'Feature one',
          },
          // No profileId or platformId
        })
        .expect(201);

      expect(res.body.data.postId).toBeDefined();
      expect(res.body.data.context.profile).toBeNull();
      expect(res.body.data.context.platform).toBeNull();
    });

    it('should validate template exists', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: '00000000-0000-0000-0000-000000000000',
          variables: {},
        })
        .expect(404);

      expect(res.body.error).toBe('Not Found');
    });

    it('should validate profile exists if provided', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'App',
            description: 'Desc',
            feature1: 'Feature',
          },
          profileId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      expect(res.body.message).toBe('Profile not found');
    });

    it('should validate platform exists if provided', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'App',
            description: 'Desc',
            feature1: 'Feature',
          },
          platformId: '00000000-0000-0000-0000-000000000000',
        })
        .expect(404);

      expect(res.body.message).toBe('Platform not found');
    });

    it('should enforce LinkedIn-only platform validation', async () => {
      // Create X platform
      const xPlatform = await Platform.create({
        name: 'X',
        styleGuidelines: 'Concise',
        maxLength: 280,
        userId: testUser.id,
      });

      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'App',
            description: 'Desc',
            feature1: 'Feature',
          },
          platformId: xPlatform.id,
        })
        .expect(400);

      expect(res.body.error).toBe('Platform Not Supported');
      expect(res.body.supportedPlatforms).toContain('LinkedIn');
    });

    it('should handle LLM errors gracefully', async () => {
      mockGenerate.mockRejectedValueOnce(new Error('LLM Service unavailable'));

      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'App',
            description: 'Desc',
            feature1: 'Feature',
          },
        })
        .expect(500);

      // Verify no post was created due to error
      const posts = await Post.findAll({ where: { userId: testUser.id } });
      expect(posts).toHaveLength(0);
    });

    it('should include template warnings in response', async () => {
      // Create template with unused optional variable
      const templateWithWarning = await Template.create({
        userId: testUser.id,
        name: 'Warning Template',
        category: 'tip',
        content: 'Using {{var1}}',
        variables: [
          { name: 'var1', description: 'Used variable', required: true },
          { name: 'var2', description: 'Unused optional variable', required: false },
        ],
        isSystem: false,
        isPublic: false,
        usageCount: 0,
      });

      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: templateWithWarning.id,
          variables: {
            var1: 'Value',
          },
        })
        .expect(201);

      // Warnings should be included if template has unused optional variables
      expect(res.body.data.warnings).toBeDefined();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/generate/from-template')
        .send({
          templateId: testTemplate.id,
          variables: {},
        })
        .expect(401);
    });

    it('should validate templateId is UUID', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: 'not-a-uuid',
          variables: {},
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
      expect(res.body.details).toBeDefined();
    });

    it('should validate variables is object', async () => {
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: 'not-an-object',
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
      expect(res.body.details).toBeDefined();
    });

    it('should allow user to access public templates from other users', async () => {
      // Create another user
      const otherUserRes = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const otherUser = (await User.findOne({
        where: { email: 'other@example.com' },
      })) as User;

      // Create public template from other user
      const publicTemplate = await Template.create({
        userId: otherUser.id,
        name: 'Public Template',
        category: 'tip',
        content: '{{tip}}',
        variables: [{ name: 'tip', description: 'The tip', required: true }],
        isSystem: false,
        isPublic: true,
        usageCount: 0,
      });

      // First user should be able to generate from it
      const res = await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: publicTemplate.id,
          variables: {
            tip: 'Always test your code',
          },
        })
        .expect(201);

      expect(res.body.data.template.name).toBe('Public Template');
    });

    it('should increment template usage count on successful generation', async () => {
      const initialUsageCount = testTemplate.usageCount;

      await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'MyApp',
            description: 'Great app',
            feature1: 'Feature one',
          },
        })
        .expect(201);

      await testTemplate.reload();
      expect(testTemplate.usageCount).toBe(initialUsageCount + 1);
    });

    it('should NOT increment usage count when variables are missing', async () => {
      const initialUsageCount = testTemplate.usageCount;

      await request(app)
        .post('/api/generate/from-template')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateId: testTemplate.id,
          variables: {
            product: 'MyApp',
            // Missing required variables
          },
        })
        .expect(400);

      await testTemplate.reload();
      expect(testTemplate.usageCount).toBe(initialUsageCount);
    });
  });
});
