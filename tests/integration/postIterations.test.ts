/**
 * Post Iterations Integration Tests
 *
 * End-to-end tests for the post iteration workflow:
 * - Generate → Iterate → List Versions → Select Version
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

const mockGenerate = llmService.generate as jest.Mock;

describe('Post Iterations Integration Tests', () => {
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
    // Clean up database in correct order
    await PostVersion.destroy({ where: {}, force: true });
    await Post.destroy({ where: {}, force: true });
    await Profile.destroy({ where: {}, force: true });
    await Project.destroy({ where: {}, force: true });
    await Platform.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'integration@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'integration@example.com' } })) as User;
    authToken = res.body.token;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Integration Profile',
      bio: 'For integration testing',
      toneTags: ['professional'],
      doRules: ['Be concise'],
      dontRules: ['No jargon'],
      userId: testUser.id,
    });

    // Create test project
    testProject = await Project.create({
      name: 'Integration Project',
      description: 'Project for testing',
      audience: 'Testers',
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

    jest.clearAllMocks();

    // Default mock response
    mockGenerate.mockResolvedValue({
      text: 'Generated content',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  // =====================================
  // Complete Workflow Tests
  // =====================================
  describe('Complete Iteration Workflow', () => {
    it('should support full generate → iterate → select workflow', async () => {
      // Step 1: Generate initial post
      mockGenerate.mockResolvedValueOnce({
        text: 'Initial post content!',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const generateRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Launch new feature',
          goal: 'Generate excitement',
          profileId: testProfile.id,
          projectId: testProject.id,
          platformId: testPlatform.id,
        })
        .expect(201);

      const postId = generateRes.body.data.postId;
      const initialVersionId = generateRes.body.data.versionId;
      expect(generateRes.body.data.versionNumber).toBe(1);
      expect(generateRes.body.data.generatedText).toBe('Initial post content!');

      // Step 2: Create first iteration
      mockGenerate.mockResolvedValueOnce({
        text: 'More professional version!',
        usage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 },
      });

      const iterate1Res = await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          iterationPrompt: 'Make it more professional',
        })
        .expect(201);

      expect(iterate1Res.body.data.versionNumber).toBe(2);
      expect(iterate1Res.body.data.generatedText).toBe('More professional version!');
      expect(iterate1Res.body.data.isSelected).toBe(true);

      // Step 3: Create second iteration
      mockGenerate.mockResolvedValueOnce({
        text: 'Shorter and punchier!',
        usage: { promptTokens: 110, completionTokens: 40, totalTokens: 150 },
      });

      const iterate2Res = await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          iterationPrompt: 'Make it shorter',
        })
        .expect(201);

      expect(iterate2Res.body.data.versionNumber).toBe(3);

      // Step 4: List all versions
      const versionsRes = await request(app)
        .get(`/api/posts/${postId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionsRes.body.data.totalVersions).toBe(3);
      expect(versionsRes.body.data.versions).toHaveLength(3);
      expect(versionsRes.body.data.versions[0].versionNumber).toBe(1);
      expect(versionsRes.body.data.versions[1].versionNumber).toBe(2);
      expect(versionsRes.body.data.versions[2].versionNumber).toBe(3);

      // Only the latest should be selected
      expect(versionsRes.body.data.versions[0].isSelected).toBe(false);
      expect(versionsRes.body.data.versions[1].isSelected).toBe(false);
      expect(versionsRes.body.data.versions[2].isSelected).toBe(true);

      // Step 5: Select version 2 (the professional one)
      const version2Id = versionsRes.body.data.versions[1].id;
      await request(app)
        .patch(`/api/posts/${postId}/versions/${version2Id}/select`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Step 6: Verify version 2 is now selected
      const finalVersionsRes = await request(app)
        .get(`/api/posts/${postId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(finalVersionsRes.body.data.versions[1].isSelected).toBe(true);
      expect(finalVersionsRes.body.data.versions[2].isSelected).toBe(false);

      // Step 7: Get post and verify generatedText matches selected version
      const postRes = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(postRes.body.data.generatedText).toBe('More professional version!');
    });

    it('should preserve original context through iterations', async () => {
      // Generate initial post
      mockGenerate.mockResolvedValueOnce({
        text: 'V1',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });

      const generateRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Feature announcement',
          profileId: testProfile.id,
        })
        .expect(201);

      const postId = generateRes.body.data.postId;

      // First iteration - verify profile context is included
      mockGenerate.mockResolvedValueOnce({
        text: 'V2',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          iterationPrompt: 'Add emojis',
        })
        .expect(201);

      // Verify the LLM was called with profile context
      expect(mockGenerate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Integration Profile'),
        }),
      );
    });

    it('should include previous version in iteration prompt', async () => {
      // Generate initial post
      mockGenerate.mockResolvedValueOnce({
        text: 'Original content here',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });

      const generateRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          rawIdea: 'Test idea',
        })
        .expect(201);

      const postId = generateRes.body.data.postId;

      // Create iteration
      mockGenerate.mockResolvedValueOnce({
        text: 'Modified content',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          iterationPrompt: 'Make changes',
        })
        .expect(201);

      // Verify the previous text was included in the prompt
      expect(mockGenerate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Original content here'),
        }),
      );
    });
  });

  // =====================================
  // Edge Cases
  // =====================================
  describe('Edge Cases', () => {
    it('should handle many iterations', async () => {
      // Generate initial post
      mockGenerate.mockResolvedValue({
        text: 'Content',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });

      const generateRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Test' })
        .expect(201);

      const postId = generateRes.body.data.postId;

      // Create 5 iterations
      for (let i = 2; i <= 6; i++) {
        const res = await request(app)
          .post(`/api/posts/${postId}/iterate`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ iterationPrompt: `Iteration ${i}` })
          .expect(201);

        expect(res.body.data.versionNumber).toBe(i);
      }

      // Verify all versions exist
      const versionsRes = await request(app)
        .get(`/api/posts/${postId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionsRes.body.data.totalVersions).toBe(6);
    });

    it('should handle selecting initial version after iterations', async () => {
      // Generate initial post
      mockGenerate.mockResolvedValueOnce({
        text: 'Original best version',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });

      const generateRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Test' })
        .expect(201);

      const postId = generateRes.body.data.postId;

      // Create iteration
      mockGenerate.mockResolvedValueOnce({
        text: 'Worse version',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ iterationPrompt: 'Make changes' })
        .expect(201);

      // Get versions to find initial version ID
      const versionsRes = await request(app)
        .get(`/api/posts/${postId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const initialVersionId = versionsRes.body.data.versions[0].id;

      // Select initial version
      await request(app)
        .patch(`/api/posts/${postId}/versions/${initialVersionId}/select`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify post now has original content
      const postRes = await request(app)
        .get(`/api/posts/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(postRes.body.data.generatedText).toBe('Original best version');
    });
  });

  // =====================================
  // Data Isolation Tests
  // =====================================
  describe('Data Isolation', () => {
    it('should not allow access to other users posts', async () => {
      // Create post for first user
      mockGenerate.mockResolvedValueOnce({
        text: 'User 1 content',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });

      const user1PostRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'User 1 idea' })
        .expect(201);

      const user1PostId = user1PostRes.body.data.postId;

      // Create second user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'user2@example.com',
        password: 'Password123',
      });
      const user2Token = user2Res.body.token;

      // Try to iterate on user1's post as user2
      await request(app)
        .post(`/api/posts/${user1PostId}/iterate`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ iterationPrompt: 'Steal content' })
        .expect(404);

      // Try to get user1's versions as user2
      await request(app)
        .get(`/api/posts/${user1PostId}/versions`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);
    });
  });

  // =====================================
  // Version Data Integrity Tests
  // =====================================
  describe('Version Data Integrity', () => {
    it('should correctly track token usage across versions', async () => {
      // Generate with specific token usage
      mockGenerate.mockResolvedValueOnce({
        text: 'V1',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const generateRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Test' })
        .expect(201);

      const postId = generateRes.body.data.postId;

      // Iterate with different token usage
      mockGenerate.mockResolvedValueOnce({
        text: 'V2',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      });

      await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ iterationPrompt: 'Changes' })
        .expect(201);

      // Get versions and verify token data
      const versionsRes = await request(app)
        .get(`/api/posts/${postId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionsRes.body.data.versions[0].usage.totalTokens).toBe(150);
      expect(versionsRes.body.data.versions[1].usage.totalTokens).toBe(300);
    });

    it('should preserve iteration prompts for each version', async () => {
      mockGenerate.mockResolvedValue({
        text: 'Content',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });

      const generateRes = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rawIdea: 'Test' })
        .expect(201);

      const postId = generateRes.body.data.postId;

      // Create iterations with different prompts
      await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ iterationPrompt: 'Make it professional' })
        .expect(201);

      await request(app)
        .post(`/api/posts/${postId}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ iterationPrompt: 'Add emojis' })
        .expect(201);

      // Verify iteration prompts are preserved
      const versionsRes = await request(app)
        .get(`/api/posts/${postId}/versions`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(versionsRes.body.data.versions[0].iterationPrompt).toBeNull();
      expect(versionsRes.body.data.versions[1].iterationPrompt).toBe('Make it professional');
      expect(versionsRes.body.data.versions[2].iterationPrompt).toBe('Add emojis');
    });
  });
});
