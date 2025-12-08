/**
 * Specialized Iterations Integration Tests
 *
 * End-to-end tests for specialized iteration types:
 * - shorter, stronger_hook, more_personal, add_data, simplify, custom
 */

import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Project, Platform, Post, PostVersion } from '../../src/models';
import { llmService } from '../../src/services/LLMService';

// Mock LLMService to avoid real API calls
jest.mock('../../src/services/LLMService', () => {
  const mockGenerate = jest.fn();

  return {
    llmService: {
      generate: mockGenerate,
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

describe('Specialized Iterations Integration Tests', () => {
  let testUser: User;
  let authToken: string;
  let testProfile: Profile;
  let testPlatform: Platform;
  let testPost: Post;

  const originalPostText = `This is the original post content.

It has multiple paragraphs with some details.
And it's reasonably long for testing purposes.

This is a great post that needs some iteration!

What do you think? #content #linkedin`;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up database
    await PostVersion.destroy({ where: {}, force: true });
    await Post.destroy({ where: {}, force: true });
    await Profile.destroy({ where: {}, force: true });
    await Platform.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'specialized@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'specialized@example.com' } })) as User;
    authToken = res.body.token;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Test Profile',
      bio: 'Professional content creator',
      toneTags: ['professional', 'friendly'],
      userId: testUser.id,
    });

    // Create LinkedIn platform
    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional and engaging',
      maxLength: 3000,
      userId: testUser.id,
    });

    // Create a test post with initial version
    testPost = await Post.create({
      userId: testUser.id,
      profileId: testProfile.id,
      platformId: testPlatform.id,
      goal: 'Share insights',
      rawIdea: 'Test idea',
      generatedText: originalPostText,
      totalVersions: 1,
    });

    // Create initial version
    const initialVersion = await PostVersion.create({
      postId: testPost.id,
      versionNumber: 1,
      generatedText: originalPostText,
      iterationPrompt: null,
      isSelected: true,
    });

    await testPost.update({ currentVersionId: initialVersion.id });

    // Reset mock before each test
    mockGenerate.mockReset();
  });

  describe('POST /api/posts/:postId/iterate - Specialized Types', () => {
    it('should create a "shorter" iteration', async () => {
      const shortenedText = 'This is shorter.\n\nMuch more concise! #content';

      mockGenerate.mockResolvedValueOnce({
        text: shortenedText,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'shorter' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Iteration created successfully');
      expect(response.body.data.iterationType).toBe('shorter');
      expect(response.body.data.generatedText).toBe(shortenedText);
      expect(response.body.data.versionNumber).toBe(2);

      // Verify the LLM was called with specialized prompt
      expect(mockGenerate).toHaveBeenCalledTimes(1);
      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('concise');
      expect(callArgs.prompt).toContain('essential message');
    });

    it('should create a "stronger_hook" iteration', async () => {
      const improvedText = 'Stop scrolling! Here is a bold statement.\n\nThe rest stays the same.';

      mockGenerate.mockResolvedValueOnce({
        text: improvedText,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'stronger_hook' });

      expect(response.status).toBe(201);
      expect(response.body.data.iterationType).toBe('stronger_hook');
      expect(response.body.data.generatedText).toBe(improvedText);

      // Verify specialized prompt includes current hook
      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('hook');
      expect(callArgs.prompt).toContain('first 2-3 lines');
      expect(callArgs.prompt).toContain('This is the original post content');
    });

    it('should create a "more_personal" iteration', async () => {
      const personalText = originalPostText + '\n\nLast week, I experienced this firsthand...';

      mockGenerate.mockResolvedValueOnce({
        text: personalText,
        usage: { promptTokens: 100, completionTokens: 60, totalTokens: 160 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'more_personal' });

      expect(response.status).toBe(201);
      expect(response.body.data.iterationType).toBe('more_personal');

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('personal anecdote');
      expect(callArgs.prompt).toContain('concrete example');
    });

    it('should create an "add_data" iteration', async () => {
      const dataText = originalPostText + '\n\nStudies show that 73% of professionals agree.';

      mockGenerate.mockResolvedValueOnce({
        text: dataText,
        usage: { promptTokens: 100, completionTokens: 55, totalTokens: 155 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'add_data' });

      expect(response.status).toBe(201);
      expect(response.body.data.iterationType).toBe('add_data');

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('data');
      expect(callArgs.prompt).toContain('statistics');
    });

    it('should create a "simplify" iteration', async () => {
      const simplifiedText = 'This is easier to read.\n\nSimple words work better.\n\nTry it! #content';

      mockGenerate.mockResolvedValueOnce({
        text: simplifiedText,
        usage: { promptTokens: 100, completionTokens: 45, totalTokens: 145 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'simplify' });

      expect(response.status).toBe(201);
      expect(response.body.data.iterationType).toBe('simplify');

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Simplify');
      expect(callArgs.prompt).toContain('jargon');
    });

    it('should create a "custom" iteration with feedback', async () => {
      const customText = 'Custom iteration result based on user feedback.';

      mockGenerate.mockResolvedValueOnce({
        text: customText,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'custom',
          feedback: 'Add more technical details about the implementation',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.iterationType).toBe('custom');
      expect(response.body.data.generatedText).toBe(customText);

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Add more technical details');
    });

    it('should support legacy "feedback" parameter (backwards compatibility)', async () => {
      const iteratedText = 'Legacy iteration result.';

      mockGenerate.mockResolvedValueOnce({
        text: iteratedText,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          feedback: 'Make it more engaging',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.iterationType).toBe('custom');
      expect(response.body.data.generatedText).toBe(iteratedText);
    });
  });

  describe('Validation', () => {
    it('should reject request without type or feedback', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toContain('Either "type" or "feedback"');
    });

    it('should reject invalid iteration type', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'invalid_type' });

      expect(response.status).toBe(400);
      // The error is caught by express-validator middleware
      // Just ensure it's a 400 status (validation error)
    });

    it('should require feedback when type is custom', async () => {
      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'custom' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(response.body.message).toContain('feedback is required when type is "custom"');
    });

    it('should reject iteration on non-existent post', async () => {
      const response = await request(app)
        .post('/api/posts/00000000-0000-0000-0000-000000000000/iterate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'shorter' });

      expect(response.status).toBe(404);
    });
  });

  describe('Version Management', () => {
    it('should increment version number correctly', async () => {
      mockGenerate.mockResolvedValue({
        text: 'Iteration result',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      // First iteration
      const res1 = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'shorter' });

      expect(res1.body.data.versionNumber).toBe(2);

      // Second iteration
      const res2 = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'stronger_hook' });

      expect(res2.body.data.versionNumber).toBe(3);
    });

    it('should update post totalVersions count', async () => {
      mockGenerate.mockResolvedValue({
        text: 'Iteration result',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'shorter' });

      const updatedPost = await Post.findByPk(testPost.id);
      expect(updatedPost?.totalVersions).toBe(2);
    });

    it('should set new version as selected', async () => {
      mockGenerate.mockResolvedValue({
        text: 'New selected version',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const response = await request(app)
        .post(`/api/posts/${testPost.id}/iterate`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ type: 'shorter' });

      expect(response.body.data.isSelected).toBe(true);

      // Verify old version is deselected
      const versions = await PostVersion.findAll({
        where: { postId: testPost.id },
      });

      const selectedVersions = versions.filter(v => v.isSelected);
      expect(selectedVersions.length).toBe(1);
      expect(selectedVersions[0]?.versionNumber).toBe(2);
    });
  });
});
