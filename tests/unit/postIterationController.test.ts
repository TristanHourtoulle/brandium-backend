/**
 * PostIterationController Unit Tests
 *
 * Comprehensive tests for PostIterationController including:
 * - iterate endpoint
 * - getVersions endpoint
 * - selectVersion endpoint
 * - getVersion endpoint
 * - Error handling for all endpoints
 */

import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Project, Platform, Post, PostVersion } from '../../src/models';
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

describe('PostIterationController Unit Tests', () => {
  let testUser: User;
  let authToken: string;
  let testProfile: Profile;
  let testProject: Project;
  let testPlatform: Platform;
  let testPost: Post;
  let initialVersion: PostVersion;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up database in correct order
    await PostVersion.destroy({ where: {}, force: true });
    await Post.destroy({ where: {}, force: true });
    await Profile.destroy({ where: {}, force: true });
    await Project.destroy({ where: {}, force: true });
    await Platform.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'iterate@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'iterate@example.com' } })) as User;
    authToken = res.body.token;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Test Profile',
      bio: 'A test profile',
      toneTags: ['professional'],
      doRules: ['Be concise'],
      dontRules: ['No jargon'],
      userId: testUser.id,
    });

    // Create test project
    testProject = await Project.create({
      name: 'Test Project',
      description: 'A test project',
      audience: 'Developers',
      keyMessages: ['Quality'],
      userId: testUser.id,
    });

    // Create test platform
    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
      userId: testUser.id,
    });

    // Create test post
    testPost = await Post.create({
      userId: testUser.id,
      profileId: testProfile.id,
      projectId: testProject.id,
      platformId: testPlatform.id,
      goal: 'Announce feature',
      rawIdea: 'New feature launched!',
      generatedText: 'Initial post content',
      totalVersions: 1,
    });

    // Create initial version
    initialVersion = await PostVersion.create({
      postId: testPost.id,
      versionNumber: 1,
      generatedText: 'Initial post content',
      iterationPrompt: null,
      isSelected: true,
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });

    // Update post with currentVersionId
    await testPost.update({ currentVersionId: initialVersion.id });

    // Reset mocks
    jest.clearAllMocks();

    // Default mock response
    mockGenerate.mockResolvedValue({
      text: 'Iterated content!',
      usage: {
        promptTokens: 120,
        completionTokens: 60,
        totalTokens: 180,
      },
    });
  });

  // =====================================
  // POST /api/posts/:postId/iterate
  // =====================================
  describe('POST /api/posts/:postId/iterate', () => {
    describe('Success Cases', () => {
      it('should create a new iteration', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            iterationPrompt: 'Make it more professional',
          })
          .expect(201);

        expect(res.body).toHaveProperty('message', 'Iteration created successfully');
        expect(res.body.data).toHaveProperty('versionId');
        expect(res.body.data).toHaveProperty('versionNumber', 2);
        expect(res.body.data).toHaveProperty('generatedText', 'Iterated content!');
        expect(res.body.data).toHaveProperty('iterationPrompt', 'Make it more professional');
        expect(res.body.data).toHaveProperty('isSelected', true);
      });

      it('should include usage in response', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            iterationPrompt: 'Add emojis',
          })
          .expect(201);

        expect(res.body.data.usage).toEqual({
          promptTokens: 120,
          completionTokens: 60,
          totalTokens: 180,
        });
      });

      it('should accept optional maxTokens', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            iterationPrompt: 'Make it shorter',
            maxTokens: 200,
          })
          .expect(201);

        expect(res.body.data).toHaveProperty('versionNumber', 2);
        expect(mockGenerate).toHaveBeenCalledWith(
          expect.objectContaining({
            maxTokens: 200,
          }),
        );
      });

      it('should increment version number on each iteration', async () => {
        // First iteration
        await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'First change' })
          .expect(201);

        // Second iteration
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Second change' })
          .expect(201);

        expect(res.body.data.versionNumber).toBe(3);
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 if iterationPrompt is missing', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({})
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 if iterationPrompt is empty', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: '' })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 if iterationPrompt is too short', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'ab' })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 if iterationPrompt is too long', async () => {
        const longPrompt = 'a'.repeat(2001);
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: longPrompt })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 if postId is not a valid UUID', async () => {
        const res = await request(app)
          .post('/api/posts/invalid-uuid/iterate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 if maxTokens is below minimum', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes', maxTokens: 10 })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 if maxTokens is above maximum', async () => {
        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes', maxTokens: 5000 })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 if post not found', async () => {
        const res = await request(app)
          .post('/api/posts/00000000-0000-0000-0000-000000000000/iterate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(404);

        expect(res.body).toHaveProperty('error', 'Not Found');
        expect(res.body).toHaveProperty('message', 'Post not found or access denied');
      });

      it('should return 404 if post belongs to another user', async () => {
        // Create another user
        const otherRes = await request(app).post('/api/auth/register').send({
          email: 'other@example.com',
          password: 'Password123',
        });
        const otherToken = otherRes.body.token;

        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${otherToken}`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(404);

        expect(res.body).toHaveProperty('message', 'Post not found or access denied');
      });
    });

    describe('Authorization Errors', () => {
      it('should return 401 without auth token', async () => {
        await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(401);
      });

      it('should return 401 with invalid auth token', async () => {
        await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', 'Bearer invalid-token')
          .send({ iterationPrompt: 'Make changes' })
          .expect(401);
      });
    });

    describe('Rate Limit Errors', () => {
      it('should return 429 when rate limited', async () => {
        const { RateLimitError } = jest.requireMock('../../src/services/LLMService');
        mockGenerate.mockRejectedValueOnce(new RateLimitError('Rate limit exceeded', 45));

        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(429);

        expect(res.body).toHaveProperty('error', 'Rate Limit Exceeded');
        expect(res.body).toHaveProperty('retryAfter', 45);
      });
    });

    describe('LLM Service Errors', () => {
      it('should return 503 when API key is missing', async () => {
        const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
        mockGenerate.mockRejectedValueOnce(new LLMServiceError('API key missing', 'API_KEY_MISSING'));

        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(503);

        expect(res.body).toHaveProperty('error', 'Generation Error');
        expect(res.body).toHaveProperty('code', 'API_KEY_MISSING');
      });

      it('should return 500 when generation fails', async () => {
        const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
        mockGenerate.mockRejectedValueOnce(
          new LLMServiceError('Generation failed', 'GENERATION_FAILED'),
        );

        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(500);

        expect(res.body).toHaveProperty('error', 'Generation Error');
        expect(res.body).toHaveProperty('code', 'GENERATION_FAILED');
      });

      it('should return 502 for API errors', async () => {
        const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
        mockGenerate.mockRejectedValueOnce(new LLMServiceError('API error', 'API_ERROR'));

        const res = await request(app)
          .post(`/api/posts/${testPost.id}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: 'Make changes' })
          .expect(502);

        expect(res.body).toHaveProperty('code', 'API_ERROR');
      });
    });
  });

  // =====================================
  // GET /api/posts/:postId/versions
  // =====================================
  describe('GET /api/posts/:postId/versions', () => {
    describe('Success Cases', () => {
      it('should return all versions for a post', async () => {
        const res = await request(app)
          .get(`/api/posts/${testPost.id}/versions`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('message', 'Versions retrieved successfully');
        expect(res.body.data).toHaveProperty('postId', testPost.id);
        expect(res.body.data).toHaveProperty('totalVersions', 1);
        expect(res.body.data.versions).toHaveLength(1);
      });

      it('should return versions with all properties', async () => {
        const res = await request(app)
          .get(`/api/posts/${testPost.id}/versions`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const version = res.body.data.versions[0];
        expect(version).toHaveProperty('id');
        expect(version).toHaveProperty('versionNumber', 1);
        expect(version).toHaveProperty('generatedText');
        expect(version).toHaveProperty('iterationPrompt');
        expect(version).toHaveProperty('isSelected');
        expect(version).toHaveProperty('usage');
        expect(version).toHaveProperty('createdAt');
      });

      it('should return multiple versions in order', async () => {
        // Create a second version
        await PostVersion.create({
          postId: testPost.id,
          versionNumber: 2,
          generatedText: 'Version 2 content',
          iterationPrompt: 'Make changes',
          isSelected: false,
        });

        const res = await request(app)
          .get(`/api/posts/${testPost.id}/versions`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(res.body.data.totalVersions).toBe(2);
        expect(res.body.data.versions).toHaveLength(2);
        expect(res.body.data.versions[0].versionNumber).toBe(1);
        expect(res.body.data.versions[1].versionNumber).toBe(2);
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 if postId is not a valid UUID', async () => {
        const res = await request(app)
          .get('/api/posts/invalid-uuid/versions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 if post not found', async () => {
        const res = await request(app)
          .get('/api/posts/00000000-0000-0000-0000-000000000000/versions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(res.body).toHaveProperty('error', 'Not Found');
      });
    });

    describe('Authorization Errors', () => {
      it('should return 401 without auth token', async () => {
        await request(app).get(`/api/posts/${testPost.id}/versions`).expect(401);
      });
    });
  });

  // =====================================
  // GET /api/posts/:postId/versions/:versionId
  // =====================================
  describe('GET /api/posts/:postId/versions/:versionId', () => {
    describe('Success Cases', () => {
      it('should return a specific version', async () => {
        const res = await request(app)
          .get(`/api/posts/${testPost.id}/versions/${initialVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('message', 'Version retrieved successfully');
        expect(res.body.data).toHaveProperty('id', initialVersion.id);
        expect(res.body.data).toHaveProperty('versionNumber', 1);
      });

      it('should return version with all properties', async () => {
        const res = await request(app)
          .get(`/api/posts/${testPost.id}/versions/${initialVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(res.body.data).toHaveProperty('generatedText');
        expect(res.body.data).toHaveProperty('iterationPrompt');
        expect(res.body.data).toHaveProperty('isSelected');
        expect(res.body.data).toHaveProperty('usage');
        expect(res.body.data).toHaveProperty('createdAt');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 if postId is not a valid UUID', async () => {
        await request(app)
          .get(`/api/posts/invalid-uuid/versions/${initialVersion.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should return 400 if versionId is not a valid UUID', async () => {
        await request(app)
          .get(`/api/posts/${testPost.id}/versions/invalid-uuid`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 if version not found', async () => {
        const res = await request(app)
          .get(`/api/posts/${testPost.id}/versions/00000000-0000-0000-0000-000000000000`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(res.body).toHaveProperty('error', 'Not Found');
        expect(res.body).toHaveProperty('message', 'Version not found');
      });
    });

    describe('Authorization Errors', () => {
      it('should return 401 without auth token', async () => {
        await request(app)
          .get(`/api/posts/${testPost.id}/versions/${initialVersion.id}`)
          .expect(401);
      });

      it('should return 404 if post belongs to another user', async () => {
        const otherRes = await request(app).post('/api/auth/register').send({
          email: 'other2@example.com',
          password: 'Password123',
        });
        const otherToken = otherRes.body.token;

        await request(app)
          .get(`/api/posts/${testPost.id}/versions/${initialVersion.id}`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(404);
      });
    });
  });

  // =====================================
  // PATCH /api/posts/:postId/versions/:versionId/select
  // =====================================
  describe('PATCH /api/posts/:postId/versions/:versionId/select', () => {
    let version2: PostVersion;

    beforeEach(async () => {
      // Create second version
      version2 = await PostVersion.create({
        postId: testPost.id,
        versionNumber: 2,
        generatedText: 'Version 2 content',
        iterationPrompt: 'Make it better',
        isSelected: false,
      });
      await testPost.update({ totalVersions: 2 });
    });

    describe('Success Cases', () => {
      it('should select a version', async () => {
        const res = await request(app)
          .patch(`/api/posts/${testPost.id}/versions/${version2.id}/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('message', 'Version selected successfully');
        expect(res.body.data).toHaveProperty('id', version2.id);
        expect(res.body.data).toHaveProperty('isSelected', true);
      });

      it('should deselect other versions', async () => {
        await request(app)
          .patch(`/api/posts/${testPost.id}/versions/${version2.id}/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        // Verify first version is deselected
        await initialVersion.reload();
        expect(initialVersion.isSelected).toBe(false);
      });

      it('should update post currentVersionId', async () => {
        await request(app)
          .patch(`/api/posts/${testPost.id}/versions/${version2.id}/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        await testPost.reload();
        expect(testPost.currentVersionId).toBe(version2.id);
      });

      it('should update post generatedText', async () => {
        await request(app)
          .patch(`/api/posts/${testPost.id}/versions/${version2.id}/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        await testPost.reload();
        expect(testPost.generatedText).toBe('Version 2 content');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 if postId is not a valid UUID', async () => {
        await request(app)
          .patch(`/api/posts/invalid-uuid/versions/${version2.id}/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });

      it('should return 400 if versionId is not a valid UUID', async () => {
        await request(app)
          .patch(`/api/posts/${testPost.id}/versions/invalid-uuid/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
      });
    });

    describe('Not Found Errors', () => {
      it('should return 404 if post not found', async () => {
        const res = await request(app)
          .patch(`/api/posts/00000000-0000-0000-0000-000000000000/versions/${version2.id}/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(res.body).toHaveProperty('error', 'Not Found');
      });

      it('should return 404 if version not found', async () => {
        const res = await request(app)
          .patch(`/api/posts/${testPost.id}/versions/00000000-0000-0000-0000-000000000000/select`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);

        expect(res.body).toHaveProperty('error', 'Not Found');
      });
    });

    describe('Authorization Errors', () => {
      it('should return 401 without auth token', async () => {
        await request(app)
          .patch(`/api/posts/${testPost.id}/versions/${version2.id}/select`)
          .expect(401);
      });

      it('should return 404 if post belongs to another user', async () => {
        const otherRes = await request(app).post('/api/auth/register').send({
          email: 'other3@example.com',
          password: 'Password123',
        });
        const otherToken = otherRes.body.token;

        await request(app)
          .patch(`/api/posts/${testPost.id}/versions/${version2.id}/select`)
          .set('Authorization', `Bearer ${otherToken}`)
          .expect(404);
      });
    });
  });
});
