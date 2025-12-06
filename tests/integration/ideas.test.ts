import request from 'supertest';
import app from '../../src/app';
import { sequelize, User, Profile, Project, Platform, PostIdea } from '../../src/models';
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

describe('Ideas API Integration Tests', () => {
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
    // Clean up in proper order (ideas first due to foreign keys)
    await PostIdea.destroy({ where: {}, truncate: true, cascade: true });
    await Profile.destroy({ where: {}, truncate: true, cascade: true });
    await Project.destroy({ where: {}, truncate: true, cascade: true });
    await Platform.destroy({ where: {}, truncate: true, cascade: true });
    await User.destroy({ where: {}, truncate: true, cascade: true });

    // Create test user
    const res = await request(app).post('/api/auth/register').send({
      email: 'ideas-test@example.com',
      password: 'Password123',
    });
    testUser = (await User.findOne({ where: { email: 'ideas-test@example.com' } })) as User;
    authToken = res.body.token;

    // Create test entities
    testProfile = await Profile.create({
      name: 'Idea Test Profile',
      bio: 'Software development expert',
      toneTags: ['professional', 'insightful'],
      doRules: ['Be concise', 'Add value'],
      dontRules: ['No fluff'],
      userId: testUser.id,
    });

    testProject = await Project.create({
      name: 'TestProject',
      description: 'A test project for idea generation',
      audience: 'Developers and tech enthusiasts',
      keyMessages: ['Innovation', 'Quality'],
      userId: testUser.id,
    });

    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
      userId: testUser.id,
    });

    // Reset mocks
    jest.clearAllMocks();

    // Default mock for idea generation
    mockGenerate.mockResolvedValue({
      text: JSON.stringify([
        {
          title: 'Leadership in Tech',
          description: 'Discuss how modern tech leaders inspire their teams through transparency and empathy.',
          suggestedGoal: 'Thought leadership',
          relevanceScore: 0.9,
          tags: ['leadership', 'tech', 'management'],
        },
        {
          title: 'Remote Work Best Practices',
          description: 'Share tips for maintaining productivity and work-life balance while working remotely.',
          suggestedGoal: 'Provide value',
          relevanceScore: 0.85,
          tags: ['remote-work', 'productivity'],
        },
        {
          title: 'AI in Software Development',
          description: 'Explore how AI tools are changing the way developers write and review code.',
          suggestedGoal: 'Industry insight',
          relevanceScore: 0.8,
          tags: ['ai', 'software', 'innovation'],
        },
      ]),
      usage: {
        promptTokens: 500,
        completionTokens: 300,
        totalTokens: 800,
      },
    });
  });

  // =====================================
  // POST /api/ideas/generate
  // =====================================
  describe('POST /api/ideas/generate', () => {
    it('should generate ideas with full context', async () => {
      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: testProfile.id,
          projectId: testProject.id,
          platformId: testPlatform.id,
          count: 3,
        })
        .expect(201);

      expect(res.body.message).toBe('Ideas generated successfully');
      expect(res.body.data.ideas).toHaveLength(3);
      expect(res.body.data.context.profile.name).toBe('Idea Test Profile');
      expect(res.body.data.context.project.name).toBe('TestProject');
      expect(res.body.data.context.platform.name).toBe('LinkedIn');
      expect(res.body.data.usage.totalTokens).toBe(800);

      // Verify ideas have expected structure
      const firstIdea = res.body.data.ideas[0];
      expect(firstIdea).toHaveProperty('id');
      expect(firstIdea).toHaveProperty('title');
      expect(firstIdea).toHaveProperty('description');
      expect(firstIdea).toHaveProperty('suggestedGoal');
      expect(firstIdea).toHaveProperty('relevanceScore');
      expect(firstIdea).toHaveProperty('tags');

      // Verify ideas saved to database
      const savedIdeas = await PostIdea.findAll({ where: { userId: testUser.id } });
      expect(savedIdeas).toHaveLength(3);
    });

    it('should generate ideas in auto mode', async () => {
      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          auto: true,
          count: 3,
        })
        .expect(201);

      expect(res.body.data.ideas.length).toBeGreaterThan(0);
      // Auto mode should have picked up existing resources
      expect(res.body.data.context.profile).not.toBeNull();
    });

    it('should generate ideas with custom context only', async () => {
      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          customContext: 'Generate ideas about sustainable tech and green coding practices',
          count: 3,
        })
        .expect(201);

      expect(res.body.data.ideas.length).toBeGreaterThan(0);
      // Custom context only means no profile/project/platform
      expect(res.body.data.context.profile).toBeNull();
      expect(res.body.data.context.project).toBeNull();
      expect(res.body.data.context.platform).toBeNull();
    });

    it('should return 400 when no context provided', async () => {
      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
      expect(res.body.suggestion).toContain('profileId');
    });

    it('should return 400 when no resources exist in auto mode', async () => {
      // Remove all resources
      await Profile.destroy({ where: { userId: testUser.id } });
      await Project.destroy({ where: { userId: testUser.id } });
      await Platform.destroy({ where: { userId: testUser.id } });

      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ auto: true })
        .expect(400);

      expect(res.body.error).toBe('No Resources');
    });

    it('should handle rate limit error', async () => {
      const { RateLimitError } = jest.requireMock('../../src/services/LLMService');
      mockGenerate.mockRejectedValueOnce(new RateLimitError('Too many requests', 60));

      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: testProfile.id,
          count: 3,
        })
        .expect(429);

      expect(res.body.error).toBe('Rate Limit Exceeded');
      expect(res.body.retryAfter).toBe(60);
    });

    it('should handle LLM service error', async () => {
      const { LLMServiceError } = jest.requireMock('../../src/services/LLMService');
      mockGenerate.mockRejectedValueOnce(new LLMServiceError('Service unavailable', 'SERVICE_UNAVAILABLE'));

      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: testProfile.id,
          count: 3,
        })
        .expect(503);

      expect(res.body.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/ideas/generate')
        .send({ auto: true })
        .expect(401);
    });

    it('should validate count parameter', async () => {
      // Count within valid range
      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: testProfile.id,
          count: 5, // Valid count
        })
        .expect(201);

      expect(res.body.data.ideas.length).toBeGreaterThan(0);
    });
  });

  // =====================================
  // GET /api/ideas
  // =====================================
  describe('GET /api/ideas', () => {
    beforeEach(async () => {
      // Create some test ideas
      await PostIdea.bulkCreate([
        {
          userId: testUser.id,
          profileId: testProfile.id,
          title: 'Idea 1',
          description: 'Description 1',
          suggestedGoal: 'Goal 1',
          relevanceScore: 0.9,
          tags: ['tag1'],
          isUsed: false,
        },
        {
          userId: testUser.id,
          profileId: testProfile.id,
          title: 'Idea 2',
          description: 'Description 2',
          relevanceScore: 0.8,
          tags: ['tag2'],
          isUsed: true,
          usedAt: new Date(),
        },
        {
          userId: testUser.id,
          projectId: testProject.id,
          title: 'Idea 3',
          description: 'Description 3',
          relevanceScore: 0.7,
          tags: [],
          isUsed: false,
        },
      ]);
    });

    it('should list all user ideas', async () => {
      const res = await request(app)
        .get('/api/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should filter by profileId', async () => {
      const res = await request(app)
        .get('/api/ideas')
        .query({ profileId: testProfile.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      res.body.data.forEach((idea: { profile: { id: string } }) => {
        expect(idea.profile?.id).toBe(testProfile.id);
      });
    });

    it('should filter by projectId', async () => {
      const res = await request(app)
        .get('/api/ideas')
        .query({ projectId: testProject.id })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].project?.id).toBe(testProject.id);
    });

    it('should filter by isUsed', async () => {
      const usedRes = await request(app)
        .get('/api/ideas')
        .query({ isUsed: 'true' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(usedRes.body.data).toHaveLength(1);
      expect(usedRes.body.data[0].isUsed).toBe(true);

      const unusedRes = await request(app)
        .get('/api/ideas')
        .query({ isUsed: 'false' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(unusedRes.body.data).toHaveLength(2);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/ideas')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(3);
      expect(res.body.pagination.totalPages).toBe(2);
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/ideas')
        .expect(401);
    });
  });

  // =====================================
  // GET /api/ideas/:id
  // =====================================
  describe('GET /api/ideas/:id', () => {
    let testIdea: PostIdea;

    beforeEach(async () => {
      testIdea = await PostIdea.create({
        userId: testUser.id,
        profileId: testProfile.id,
        title: 'Specific Idea',
        description: 'Detailed description',
        suggestedGoal: 'Test goal',
        relevanceScore: 0.95,
        tags: ['test', 'specific'],
        generationContext: {
          mode: 'manual',
          historicalPostsCount: 0,
          recentTopicsExcluded: [],
          timestamp: new Date().toISOString(),
        },
        isUsed: false,
      });
    });

    it('should get idea by ID', async () => {
      const res = await request(app)
        .get(`/api/ideas/${testIdea.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(testIdea.id);
      expect(res.body.data.title).toBe('Specific Idea');
      expect(res.body.data.description).toBe('Detailed description');
      expect(res.body.data.suggestedGoal).toBe('Test goal');
      expect(res.body.data.relevanceScore).toBe('0.95');
      expect(res.body.data.tags).toEqual(['test', 'specific']);
      expect(res.body.data.generationContext.mode).toBe('manual');
      expect(res.body.data.profile.name).toBe('Idea Test Profile');
    });

    it('should return 404 for non-existent idea', async () => {
      const res = await request(app)
        .get('/api/ideas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(res.body.error).toBe('Not Found');
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/ideas/${testIdea.id}`)
        .expect(401);
    });
  });

  // =====================================
  // POST /api/ideas/:id/use
  // =====================================
  describe('POST /api/ideas/:id/use', () => {
    let testIdea: PostIdea;

    beforeEach(async () => {
      testIdea = await PostIdea.create({
        userId: testUser.id,
        title: 'Unused Idea',
        description: 'Will be marked as used',
        relevanceScore: 0.8,
        tags: [],
        isUsed: false,
      });
    });

    it('should mark idea as used', async () => {
      const res = await request(app)
        .post(`/api/ideas/${testIdea.id}/use`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(res.body.message).toBe('Idea marked as used');
      expect(res.body.data.id).toBe(testIdea.id);
      expect(res.body.data.isUsed).toBe(true);
      expect(res.body.data.usedAt).not.toBeNull();

      // Verify in database
      const updatedIdea = await PostIdea.findByPk(testIdea.id);
      expect(updatedIdea?.isUsed).toBe(true);
    });

    it('should mark idea as used without postId', async () => {
      // Mark as used without linking to a post
      const res = await request(app)
        .post(`/api/ideas/${testIdea.id}/use`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(res.body.data.isUsed).toBe(true);
      expect(res.body.data.postId).toBeNull();
    });

    it('should return 404 for non-existent idea', async () => {
      await request(app)
        .post('/api/ideas/00000000-0000-0000-0000-000000000000/use')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .post(`/api/ideas/${testIdea.id}/use`)
        .send({})
        .expect(401);
    });
  });

  // =====================================
  // DELETE /api/ideas/:id
  // =====================================
  describe('DELETE /api/ideas/:id', () => {
    let testIdea: PostIdea;

    beforeEach(async () => {
      testIdea = await PostIdea.create({
        userId: testUser.id,
        title: 'To Be Deleted',
        description: 'This idea will be deleted',
        relevanceScore: 0.5,
        tags: [],
        isUsed: false,
      });
    });

    it('should delete idea', async () => {
      const res = await request(app)
        .delete(`/api/ideas/${testIdea.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.message).toBe('Idea deleted successfully');

      // Verify deletion
      const deletedIdea = await PostIdea.findByPk(testIdea.id);
      expect(deletedIdea).toBeNull();
    });

    it('should return 404 for non-existent idea', async () => {
      await request(app)
        .delete('/api/ideas/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete(`/api/ideas/${testIdea.id}`)
        .expect(401);
    });
  });

  // =====================================
  // DELETE /api/ideas (bulk delete)
  // =====================================
  describe('DELETE /api/ideas (bulk)', () => {
    let ideaIds: string[];

    beforeEach(async () => {
      const ideas = await PostIdea.bulkCreate([
        { userId: testUser.id, title: 'Idea A', description: 'Desc A', relevanceScore: 0.5, tags: [], isUsed: false },
        { userId: testUser.id, title: 'Idea B', description: 'Desc B', relevanceScore: 0.5, tags: [], isUsed: false },
        { userId: testUser.id, title: 'Idea C', description: 'Desc C', relevanceScore: 0.5, tags: [], isUsed: false },
      ]);
      ideaIds = ideas.map((i) => i.id);
    });

    it('should bulk delete ideas', async () => {
      const res = await request(app)
        .delete('/api/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: ideaIds.slice(0, 2) })
        .expect(200);

      expect(res.body.deletedCount).toBe(2);

      // Verify 2 deleted, 1 remaining
      const remaining = await PostIdea.findAll({ where: { userId: testUser.id } });
      expect(remaining).toHaveLength(1);
      expect(remaining[0]!.id).toBe(ideaIds[2]);
    });

    it('should return 400 for empty ids array', async () => {
      const res = await request(app)
        .delete('/api/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [] })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });

    it('should return 400 for missing ids', async () => {
      await request(app)
        .delete('/api/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/ideas')
        .send({ ids: ideaIds })
        .expect(401);
    });

    it('should only delete own ideas', async () => {
      // Register another user
      const user2Res = await request(app).post('/api/auth/register').send({
        email: 'other@example.com',
        password: 'Password123',
      });
      const user2 = (await User.findOne({ where: { email: 'other@example.com' } })) as User;

      // Create idea for other user
      const otherIdea = await PostIdea.create({
        userId: user2.id,
        title: 'Other User Idea',
        description: 'Not yours',
        relevanceScore: 0.5,
        tags: [],
        isUsed: false,
      });

      // Try to delete other user's idea
      const res = await request(app)
        .delete('/api/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: [otherIdea.id] })
        .expect(200);

      expect(res.body.deletedCount).toBe(0);

      // Verify other user's idea still exists
      const stillExists = await PostIdea.findByPk(otherIdea.id);
      expect(stillExists).not.toBeNull();
    });
  });

  // =====================================
  // User Isolation Tests
  // =====================================
  describe('User Isolation', () => {
    let otherUser: User;
    let otherToken: string;
    let userIdea: PostIdea;
    let otherIdea: PostIdea;

    beforeEach(async () => {
      // Create second user
      const res = await request(app).post('/api/auth/register').send({
        email: 'isolation@example.com',
        password: 'Password123',
      });
      otherUser = (await User.findOne({ where: { email: 'isolation@example.com' } })) as User;
      otherToken = res.body.token;

      // Create ideas for both users
      userIdea = await PostIdea.create({
        userId: testUser.id,
        title: 'User 1 Idea',
        description: 'Belongs to user 1',
        relevanceScore: 0.5,
        tags: [],
        isUsed: false,
      });

      otherIdea = await PostIdea.create({
        userId: otherUser.id,
        title: 'User 2 Idea',
        description: 'Belongs to user 2',
        relevanceScore: 0.5,
        tags: [],
        isUsed: false,
      });
    });

    it('should not list other user ideas', async () => {
      const res = await request(app)
        .get('/api/ideas')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(userIdea.id);
    });

    it('should not get other user idea by ID', async () => {
      await request(app)
        .get(`/api/ideas/${otherIdea.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should not mark other user idea as used', async () => {
      await request(app)
        .post(`/api/ideas/${otherIdea.id}/use`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(404);
    });

    it('should not delete other user idea', async () => {
      await request(app)
        .delete(`/api/ideas/${otherIdea.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Verify still exists
      const stillExists = await PostIdea.findByPk(otherIdea.id);
      expect(stillExists).not.toBeNull();
    });

    it('should not use other user profile for generation', async () => {
      // Create profile for other user
      const otherProfile = await Profile.create({
        userId: otherUser.id,
        name: 'Other Profile',
      });

      const res = await request(app)
        .post('/api/ideas/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          profileId: otherProfile.id,
          count: 3,
        })
        .expect(400);

      expect(res.body.error).toBe('Validation Error');
    });
  });
});
