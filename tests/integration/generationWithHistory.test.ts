import request from 'supertest';
import app from '../../src/app';
import {
  User,
  Profile,
  Project,
  Platform,
  Post,
  HistoricalPost,
  PostVersion,
} from '../../src/models';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

describe('Generation with Historical Posts Integration Tests', () => {
  let user: User;
  let token: string;
  let profile: Profile;
  let platform: Platform;
  let project: Project;

  beforeAll(async () => {
    // Create test user
    const passwordHash = await bcrypt.hash('TestPassword123', 12);
    user = await User.create({
      email: `generation-history-test-${Date.now()}@test.com`,
      passwordHash,
    });
    token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: '1h',
    });
  });

  afterAll(async () => {
    // Clean up
    if (user) {
      await HistoricalPost.destroy({ where: { userId: user.id } });
      await PostVersion.destroy({
        where: {},
        truncate: true,
        cascade: true,
      });
      await Post.destroy({ where: { userId: user.id } });
      await Profile.destroy({ where: { userId: user.id } });
      await Platform.destroy({ where: { userId: user.id } });
      await Project.destroy({ where: { userId: user.id } });
      await User.destroy({ where: { id: user.id } });
    }
  });

  beforeEach(async () => {
    // Clean up posts and historical posts between tests
    await HistoricalPost.destroy({ where: { userId: user.id } });
    await PostVersion.destroy({ where: {}, truncate: true, cascade: true });
    await Post.destroy({ where: { userId: user.id } });
    await Profile.destroy({ where: { userId: user.id } });
    await Platform.destroy({ where: { userId: user.id } });
    await Project.destroy({ where: { userId: user.id } });

    // Create fresh profile for each test
    profile = await Profile.create({
      userId: user.id,
      name: 'Test Profile',
      bio: 'A test profile for generation',
      toneTags: ['professional'],
      doRules: ['Be concise'],
      dontRules: ['No jargon'],
    });

    // Create platform
    platform = await Platform.create({
      userId: user.id,
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
    });

    // Create project
    project = await Project.create({
      userId: user.id,
      name: 'Test Project',
      description: 'A test project',
      audience: 'Developers',
      keyMessages: ['Innovation'],
    });
  });

  describe('POST /api/generate with historical posts', () => {
    it('should include historicalPostsUsed in response when profile has posts', async () => {
      // Create some historical posts
      await HistoricalPost.bulkCreate([
        {
          userId: user.id,
          profileId: profile.id,
          platformId: platform.id,
          content: 'This is my first test post about technology.',
          publishedAt: new Date('2024-01-15'),
          engagement: { likes: 100, comments: 20 },
        },
        {
          userId: user.id,
          profileId: profile.id,
          platformId: platform.id,
          content: 'Another post sharing insights about development.',
          publishedAt: new Date('2024-01-10'),
          engagement: { likes: 50, comments: 10 },
        },
        {
          userId: user.id,
          profileId: profile.id,
          platformId: platform.id,
          content: 'Sharing my journey as a developer.',
          publishedAt: new Date('2024-01-05'),
          engagement: { likes: 75, comments: 15 },
        },
      ]);

      // Mock the LLM service to avoid actual API calls
      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockResolvedValueOnce({
          text: 'Generated post with historical context',
          usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profileId: profile.id,
          platformId: platform.id,
          projectId: project.id,
          goal: 'Share insights',
          rawIdea: 'I want to talk about AI in development',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.context.historicalPostsUsed).toBe(3);

      mockGenerate.mockRestore();
    });

    it('should return 0 historicalPostsUsed when profile has no posts', async () => {
      // No historical posts created

      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockResolvedValueOnce({
          text: 'Generated post without historical context',
          usage: { promptTokens: 150, completionTokens: 100, totalTokens: 250 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profileId: profile.id,
          rawIdea: 'I want to talk about coding',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.context.historicalPostsUsed).toBe(0);

      mockGenerate.mockRestore();
    });

    it('should return 0 historicalPostsUsed when no profile is provided', async () => {
      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockResolvedValueOnce({
          text: 'Generated post without profile',
          usage: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rawIdea: 'I want to talk about programming',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.context.historicalPostsUsed).toBe(0);

      mockGenerate.mockRestore();
    });

    it('should limit historical posts to max 5', async () => {
      // Create 10 historical posts
      const posts = [];
      for (let i = 0; i < 10; i++) {
        posts.push({
          userId: user.id,
          profileId: profile.id,
          platformId: platform.id,
          content: `Test post number ${i + 1} with enough content to be valid.`,
          publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Each day older
          engagement: { likes: 100 - i * 5, comments: 10 },
        });
      }
      await HistoricalPost.bulkCreate(posts);

      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockResolvedValueOnce({
          text: 'Generated post with limited history',
          usage: { promptTokens: 300, completionTokens: 100, totalTokens: 400 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profileId: profile.id,
          rawIdea: 'Generate something interesting',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.context.historicalPostsUsed).toBeLessThanOrEqual(5);

      mockGenerate.mockRestore();
    });

    it('should prioritize posts from the same platform', async () => {
      // Create a second platform
      const twitterPlatform = await Platform.create({
        userId: user.id,
        name: 'Twitter',
        maxLength: 280,
      });

      // Create posts for different platforms
      await HistoricalPost.bulkCreate([
        {
          userId: user.id,
          profileId: profile.id,
          platformId: platform.id, // LinkedIn
          content: 'LinkedIn post 1 with professional content.',
          publishedAt: new Date('2024-01-15'),
          engagement: { likes: 50, comments: 5 },
        },
        {
          userId: user.id,
          profileId: profile.id,
          platformId: twitterPlatform.id, // Twitter
          content: 'Twitter post with casual tone.',
          publishedAt: new Date('2024-01-14'),
          engagement: { likes: 200, comments: 50 }, // Higher engagement
        },
        {
          userId: user.id,
          profileId: profile.id,
          platformId: platform.id, // LinkedIn
          content: 'LinkedIn post 2 about business.',
          publishedAt: new Date('2024-01-13'),
          engagement: { likes: 30, comments: 3 },
        },
      ]);

      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockResolvedValueOnce({
          text: 'Generated LinkedIn post',
          usage: { promptTokens: 250, completionTokens: 100, totalTokens: 350 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profileId: profile.id,
          platformId: platform.id, // Generating for LinkedIn
          rawIdea: 'Share business insights',
        });

      expect(response.status).toBe(201);
      // Should include some posts (exact count depends on scoring)
      expect(response.body.data.context.historicalPostsUsed).toBeGreaterThan(0);

      mockGenerate.mockRestore();
    });

    it('should work when generation fails (backward compatible)', async () => {
      // Create historical posts
      await HistoricalPost.create({
        userId: user.id,
        profileId: profile.id,
        content: 'Test historical post',
        publishedAt: new Date(),
      });

      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockRejectedValueOnce(
          new (require('../../src/services/LLMService').LLMServiceError)(
            'API Error',
            'API_ERROR',
          ),
        );

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profileId: profile.id,
          rawIdea: 'Test idea',
        });

      // Should return error but not crash
      expect(response.status).toBe(502);
      expect(response.body.code).toBe('API_ERROR');

      mockGenerate.mockRestore();
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without historical posts (existing behavior)', async () => {
      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockResolvedValueOnce({
          text: 'Generated without history',
          usage: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          profileId: profile.id,
          projectId: project.id,
          platformId: platform.id,
          goal: 'Engage audience',
          rawIdea: 'Share development tips',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Post generated successfully');
      expect(response.body.data.generatedText).toBe('Generated without history');
      expect(response.body.data.context.profile).toEqual({
        id: profile.id,
        name: profile.name,
      });

      mockGenerate.mockRestore();
    });

    it('should still work with only rawIdea', async () => {
      const mockGenerate = jest
        .spyOn(require('../../src/services/LLMService').llmService, 'generate')
        .mockResolvedValueOnce({
          text: 'Minimal generation',
          usage: { promptTokens: 50, completionTokens: 50, totalTokens: 100 },
        });

      const response = await request(app)
        .post('/api/generate')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rawIdea: 'Just a simple idea',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.context.historicalPostsUsed).toBe(0);
      expect(response.body.data.context.profile).toBeNull();

      mockGenerate.mockRestore();
    });
  });
});
