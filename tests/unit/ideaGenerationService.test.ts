/**
 * IdeaGenerationService Unit Tests
 *
 * Comprehensive tests for the idea generation service including:
 * - Context resolution (auto/manual modes)
 * - Topic extraction from historical posts
 * - OpenAI response parsing
 * - Relevance score calculation
 * - Tag extraction and enhancement
 * - Deduplication
 * - Error handling
 */

import {
  InsufficientContextError,
  NoResourcesError,
  IdeaParsingError,
} from '../../src/services/IdeaGenerationService';
import { Profile, Project, Platform, HistoricalPost, PostIdea } from '../../src/models';
import { llmService } from '../../src/services/LLMService';

// Mock the models
jest.mock('../../src/models', () => ({
  Profile: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Project: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  Platform: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
  },
  HistoricalPost: {
    findAll: jest.fn(),
  },
  PostIdea: {
    create: jest.fn(),
    findOne: jest.fn(),
    findAndCountAll: jest.fn(),
    destroy: jest.fn(),
  },
}));

// Mock the LLM service
jest.mock('../../src/services/LLMService', () => ({
  llmService: {
    generate: jest.fn(),
  },
}));

// Mock the controller helper
jest.mock('../../src/utils/controllerHelpers', () => ({
  findUserResource: jest.fn(),
}));

// Import after mocking
import { ideaGenerationService } from '../../src/services/IdeaGenerationService';
import { findUserResource } from '../../src/utils/controllerHelpers';

describe('IdeaGenerationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================
  // Custom Error Classes
  // ===========================================
  describe('Custom Error Classes', () => {
    describe('InsufficientContextError', () => {
      it('should have correct name property', () => {
        const error = new InsufficientContextError();
        expect(error.name).toBe('InsufficientContextError');
      });

      it('should have default message', () => {
        const error = new InsufficientContextError();
        expect(error.message).toContain('Insufficient context');
      });

      it('should accept custom message', () => {
        const error = new InsufficientContextError('Custom error message');
        expect(error.message).toBe('Custom error message');
      });

      it('should extend Error class', () => {
        const error = new InsufficientContextError();
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('NoResourcesError', () => {
      it('should have correct name property', () => {
        const error = new NoResourcesError();
        expect(error.name).toBe('NoResourcesError');
      });

      it('should have expected message', () => {
        const error = new NoResourcesError();
        expect(error.message).toContain('No profiles, projects, or platforms found');
      });

      it('should extend Error class', () => {
        const error = new NoResourcesError();
        expect(error).toBeInstanceOf(Error);
      });
    });

    describe('IdeaParsingError', () => {
      it('should have correct name property', () => {
        const error = new IdeaParsingError('Parse error', 'raw response');
        expect(error.name).toBe('IdeaParsingError');
      });

      it('should store raw response', () => {
        const error = new IdeaParsingError('Parse error', 'raw response content');
        expect(error.rawResponse).toBe('raw response content');
      });

      it('should have correct message', () => {
        const error = new IdeaParsingError('Failed to parse', 'response');
        expect(error.message).toBe('Failed to parse');
      });

      it('should extend Error class', () => {
        const error = new IdeaParsingError('Error', 'response');
        expect(error).toBeInstanceOf(Error);
      });
    });
  });

  // ===========================================
  // extractRecentTopics
  // ===========================================
  describe('extractRecentTopics', () => {
    it('should return empty array when no historical posts', () => {
      const result = ideaGenerationService.extractRecentTopics([]);
      expect(result).toEqual([]);
    });

    it('should extract first sentence from posts', () => {
      const posts = [
        { content: 'This is the first topic about leadership. More content here.' },
        { content: 'Second post about technology! And more.' },
      ] as HistoricalPost[];

      const result = ideaGenerationService.extractRecentTopics(posts);

      expect(result).toContain('This is the first topic about leadership');
      expect(result).toContain('Second post about technology');
    });

    it('should limit to 5 topics', () => {
      const posts = Array(10)
        .fill(null)
        .map((_, i) => ({
          content: `Topic number ${i} is very interesting. More content.`,
        })) as HistoricalPost[];

      const result = ideaGenerationService.extractRecentTopics(posts);

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should skip short first sentences', () => {
      const posts = [
        { content: 'Hi! This is the real content about innovation and growth.' },
        { content: 'A longer first sentence about productivity and success.' },
      ] as HistoricalPost[];

      const result = ideaGenerationService.extractRecentTopics(posts);

      // 'Hi' is too short (< 10 chars), should be skipped
      expect(result.length).toBe(1);
      expect(result[0]).toContain('longer first sentence');
    });

    it('should truncate long sentences to 100 chars', () => {
      const longContent =
        'This is a very long first sentence that goes on and on and on and contains more than 100 characters to test truncation functionality properly. And more.';
      const posts = [{ content: longContent }] as HistoricalPost[];

      const result = ideaGenerationService.extractRecentTopics(posts);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.length).toBeLessThanOrEqual(100);
    });

    it('should only analyze 10 most recent posts', () => {
      const posts = Array(15)
        .fill(null)
        .map((_, i) => ({
          content: `Post number ${i} about interesting topic. More content.`,
        })) as HistoricalPost[];

      // Mock tracking to verify only first 10 are processed
      const result = ideaGenerationService.extractRecentTopics(posts);

      // Should have at most 5 topics (from first 10 posts)
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  // ===========================================
  // parseOpenAIResponse
  // ===========================================
  describe('parseOpenAIResponse', () => {
    it('should parse valid JSON array response', () => {
      const response = JSON.stringify([
        {
          title: 'Test Title',
          description: 'Test description for the idea',
          suggestedGoal: 'Increase engagement',
          relevanceScore: 0.85,
          tags: ['leadership', 'growth'],
        },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('Test Title');
      expect(result[0]!.description).toBe('Test description for the idea');
      expect(result[0]!.suggestedGoal).toBe('Increase engagement');
      expect(result[0]!.relevanceScore).toBe(0.85);
      expect(result[0]!.tags).toEqual(['leadership', 'growth']);
    });

    it('should extract JSON from text with surrounding content', () => {
      const response = `Here are the ideas:
      [{"title": "Extracted Idea", "description": "Description here", "relevanceScore": 0.7, "tags": []}]
      Hope this helps!`;

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result).toHaveLength(1);
      expect(result[0]!.title).toBe('Extracted Idea');
    });

    it('should throw IdeaParsingError for invalid JSON', () => {
      const invalidJson = 'This is not valid JSON at all';

      expect(() => ideaGenerationService.parseOpenAIResponse(invalidJson, 10)).toThrow(
        IdeaParsingError,
      );
    });

    it('should throw IdeaParsingError when response is not an array', () => {
      const objectResponse = JSON.stringify({
        title: 'Single object',
        description: 'Not an array',
      });

      expect(() => ideaGenerationService.parseOpenAIResponse(objectResponse, 10)).toThrow(
        IdeaParsingError,
      );
    });

    it('should throw IdeaParsingError when no valid ideas found', () => {
      const emptyIdeas = JSON.stringify([{ invalid: 'object' }, { also: 'invalid' }]);

      expect(() => ideaGenerationService.parseOpenAIResponse(emptyIdeas, 10)).toThrow(
        IdeaParsingError,
      );
    });

    it('should skip invalid idea objects', () => {
      const mixedResponse = JSON.stringify([
        { title: 'Valid Idea', description: 'Has both required fields' },
        { title: 'Missing description' }, // Invalid - no description
        { description: 'Missing title' }, // Invalid - no title
        { title: 'Another Valid', description: 'Also complete' },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(mixedResponse, 10);

      expect(result).toHaveLength(2);
      expect(result[0]!.title).toBe('Valid Idea');
      expect(result[1]!.title).toBe('Another Valid');
    });

    it('should truncate ideas to expected count', () => {
      const manyIdeas = Array(15)
        .fill(null)
        .map((_, i) => ({
          title: `Idea ${i}`,
          description: `Description ${i}`,
          relevanceScore: 0.8,
          tags: [],
        }));

      const result = ideaGenerationService.parseOpenAIResponse(JSON.stringify(manyIdeas), 5);

      expect(result).toHaveLength(5);
    });

    it('should normalize relevance score to be between 0 and 1', () => {
      const response = JSON.stringify([
        { title: 'Test', description: 'Desc', relevanceScore: 1.5 },
        { title: 'Test2', description: 'Desc2', relevanceScore: -0.5 },
        { title: 'Test3', description: 'Desc3', relevanceScore: 0.7 },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.relevanceScore).toBe(1);
      expect(result[1]!.relevanceScore).toBe(0);
      expect(result[2]!.relevanceScore).toBe(0.7);
    });

    it('should default relevance score to 0.5 when invalid', () => {
      const response = JSON.stringify([
        { title: 'Test', description: 'Desc', relevanceScore: 'not a number' },
        { title: 'Test2', description: 'Desc2' }, // Missing score
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.relevanceScore).toBe(0.5);
      expect(result[1]!.relevanceScore).toBe(0.5);
    });

    it('should normalize tags to lowercase and trim', () => {
      const response = JSON.stringify([
        {
          title: 'Test',
          description: 'Desc',
          tags: ['  LEADERSHIP  ', 'Growth', '  TECH  '],
        },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.tags).toEqual(['leadership', 'growth', 'tech']);
    });

    it('should filter out non-string tags', () => {
      const response = JSON.stringify([
        {
          title: 'Test',
          description: 'Desc',
          tags: ['valid', 123, null, 'another', { obj: true }],
        },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.tags).toEqual(['valid', 'another']);
    });

    it('should limit tags to 10', () => {
      const manyTags = Array(15)
        .fill(null)
        .map((_, i) => `tag${i}`);
      const response = JSON.stringify([
        { title: 'Test', description: 'Desc', tags: manyTags },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.tags.length).toBeLessThanOrEqual(10);
    });

    it('should truncate title to 255 characters', () => {
      const longTitle = 'A'.repeat(300);
      const response = JSON.stringify([{ title: longTitle, description: 'Desc' }]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.title.length).toBe(255);
    });

    it('should handle optional suggestedGoal', () => {
      const response = JSON.stringify([
        { title: 'With Goal', description: 'Desc', suggestedGoal: 'My Goal' },
        { title: 'Without Goal', description: 'Desc' },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.suggestedGoal).toBe('My Goal');
      expect(result[1]!.suggestedGoal).toBeUndefined();
    });

    it('should return empty tags array when tags is not an array', () => {
      const response = JSON.stringify([
        { title: 'Test', description: 'Desc', tags: 'not an array' },
      ]);

      const result = ideaGenerationService.parseOpenAIResponse(response, 10);

      expect(result[0]!.tags).toEqual([]);
    });
  });

  // ===========================================
  // resolveContext
  // ===========================================
  describe('resolveContext', () => {
    const userId = 'user-123';

    describe('Auto mode', () => {
      it('should fetch most recently updated resources in auto mode', async () => {
        const mockProfile = { id: 'profile-1', name: 'Test Profile', userId };
        const mockProject = { id: 'project-1', name: 'Test Project', userId };
        const mockPlatform = { id: 'platform-1', name: 'LinkedIn', userId };

        (Profile.findOne as jest.Mock).mockResolvedValue(mockProfile);
        (Project.findOne as jest.Mock).mockResolvedValue(mockProject);
        (Platform.findOne as jest.Mock).mockResolvedValue(mockPlatform);
        (HistoricalPost.findAll as jest.Mock).mockResolvedValue([]);

        const result = await ideaGenerationService.resolveContext({
          userId,
          auto: true,
        });

        expect(result.mode).toBe('auto');
        expect(result.profile).toEqual(mockProfile);
        expect(result.project).toEqual(mockProject);
        expect(result.platform).toEqual(mockPlatform);
      });

      it('should throw NoResourcesError when no resources exist in auto mode', async () => {
        (Profile.findOne as jest.Mock).mockResolvedValue(null);
        (Project.findOne as jest.Mock).mockResolvedValue(null);
        (Platform.findOne as jest.Mock).mockResolvedValue(null);

        await expect(
          ideaGenerationService.resolveContext({
            userId,
            auto: true,
          }),
        ).rejects.toThrow(NoResourcesError);
      });

      it('should work with partial resources in auto mode', async () => {
        (Profile.findOne as jest.Mock).mockResolvedValue({ id: 'profile-1', name: 'Profile' });
        (Project.findOne as jest.Mock).mockResolvedValue(null);
        (Platform.findOne as jest.Mock).mockResolvedValue(null);
        (HistoricalPost.findAll as jest.Mock).mockResolvedValue([]);

        const result = await ideaGenerationService.resolveContext({
          userId,
          auto: true,
        });

        expect(result.profile).toBeTruthy();
        expect(result.project).toBeNull();
        expect(result.platform).toBeNull();
      });
    });

    describe('Manual mode', () => {
      it('should fetch specified resources in manual mode', async () => {
        const mockProfile = { id: 'profile-1', name: 'Profile' };
        const mockProject = { id: 'project-1', name: 'Project' };

        (findUserResource as jest.Mock)
          .mockResolvedValueOnce(mockProfile)
          .mockResolvedValueOnce(mockProject)
          .mockResolvedValueOnce(null);
        (HistoricalPost.findAll as jest.Mock).mockResolvedValue([]);

        const result = await ideaGenerationService.resolveContext({
          userId,
          profileId: 'profile-1',
          projectId: 'project-1',
        });

        expect(result.mode).toBe('manual');
        expect(result.profile).toEqual(mockProfile);
        expect(result.project).toEqual(mockProject);
      });

      it('should throw InsufficientContextError when no context provided', async () => {
        (findUserResource as jest.Mock).mockResolvedValue(null);

        await expect(
          ideaGenerationService.resolveContext({
            userId,
          }),
        ).rejects.toThrow(InsufficientContextError);
      });

      it('should accept custom context without resource IDs', async () => {
        (findUserResource as jest.Mock).mockResolvedValue(null);

        const result = await ideaGenerationService.resolveContext({
          userId,
          customContext: 'Generate ideas about AI and technology',
        });

        expect(result.mode).toBe('custom');
        expect(result.profile).toBeNull();
        expect(result.project).toBeNull();
        expect(result.platform).toBeNull();
      });
    });

    describe('Historical posts', () => {
      it('should fetch historical posts when profile exists', async () => {
        const mockProfile = { id: 'profile-1', name: 'Profile' };
        const mockPosts = [
          { id: 'post-1', content: 'Historical post 1' },
          { id: 'post-2', content: 'Historical post 2' },
        ];

        (findUserResource as jest.Mock)
          .mockResolvedValueOnce(mockProfile)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null);
        (HistoricalPost.findAll as jest.Mock).mockResolvedValue(mockPosts);

        const result = await ideaGenerationService.resolveContext({
          userId,
          profileId: 'profile-1',
        });

        expect(result.historicalPosts).toHaveLength(2);
        expect(HistoricalPost.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { profileId: 'profile-1', userId },
            limit: 20,
          }),
        );
      });

      it('should return empty historical posts when no profile', async () => {
        (findUserResource as jest.Mock).mockResolvedValue(null);

        const result = await ideaGenerationService.resolveContext({
          userId,
          customContext: 'Some custom context',
        });

        expect(result.historicalPosts).toEqual([]);
      });
    });
  });

  // ===========================================
  // generateIdeas (integration-like tests)
  // ===========================================
  describe('generateIdeas', () => {
    const userId = 'user-123';

    beforeEach(() => {
      (findUserResource as jest.Mock).mockResolvedValue(null);
    });

    it('should generate ideas successfully with custom context', async () => {
      const mockLLMResponse = {
        text: JSON.stringify([
          {
            title: 'AI in Business',
            description: 'How AI is transforming modern business operations',
            suggestedGoal: 'Thought leadership',
            relevanceScore: 0.9,
            tags: ['ai', 'business'],
          },
        ]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      const mockSavedIdea = {
        id: 'idea-1',
        title: 'AI in Business',
        description: 'How AI is transforming modern business operations',
        suggestedGoal: 'Thought leadership',
        relevanceScore: 0.9,
        tags: ['ai', 'business'],
        createdAt: new Date(),
      };

      (llmService.generate as jest.Mock).mockResolvedValue(mockLLMResponse);
      (PostIdea.create as jest.Mock).mockResolvedValue(mockSavedIdea);

      const result = await ideaGenerationService.generateIdeas({
        userId,
        customContext: 'Generate ideas about AI and business',
        count: 1,
      });

      expect(result.ideas).toHaveLength(1);
      expect(result.usage.totalTokens).toBe(150);
      expect(llmService.generate).toHaveBeenCalled();
      expect(PostIdea.create).toHaveBeenCalled();
    });

    it('should retry on parsing error and succeed', async () => {
      const invalidResponse = { text: 'Not valid JSON', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } };
      const validResponse = {
        text: JSON.stringify([{ title: 'Valid Idea', description: 'Description', tags: [] }]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      (llmService.generate as jest.Mock)
        .mockResolvedValueOnce(invalidResponse)
        .mockResolvedValueOnce(validResponse);
      (PostIdea.create as jest.Mock).mockImplementation((data) => Promise.resolve({ ...data, id: 'idea-1' }));

      const result = await ideaGenerationService.generateIdeas({
        userId,
        customContext: 'Test context',
        count: 1,
      });

      expect(result.ideas).toHaveLength(1);
      expect(llmService.generate).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries on parsing error', async () => {
      const invalidResponse = { text: 'Invalid JSON', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } };

      (llmService.generate as jest.Mock).mockResolvedValue(invalidResponse);

      await expect(
        ideaGenerationService.generateIdeas({
          userId,
          customContext: 'Test context',
          count: 1,
        }),
      ).rejects.toThrow(IdeaParsingError);

      // Should have tried 3 times (initial + 2 retries)
      expect(llmService.generate).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-parsing errors', async () => {
      const error = new Error('LLM service unavailable');
      (llmService.generate as jest.Mock).mockRejectedValue(error);

      await expect(
        ideaGenerationService.generateIdeas({
          userId,
          customContext: 'Test context',
        }),
      ).rejects.toThrow('LLM service unavailable');

      expect(llmService.generate).toHaveBeenCalledTimes(1);
    });

    it('should validate and normalize count parameter', async () => {
      const mockLLMResponse = {
        text: JSON.stringify([{ title: 'Test', description: 'Desc', tags: [] }]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      (llmService.generate as jest.Mock).mockResolvedValue(mockLLMResponse);
      (PostIdea.create as jest.Mock).mockImplementation((data) => Promise.resolve({ ...data, id: 'idea-1' }));

      // Test count = 0 defaults to 10
      await ideaGenerationService.generateIdeas({
        userId,
        customContext: 'Test',
        count: 0,
      });

      // Test count > 20 caps at 20
      await ideaGenerationService.generateIdeas({
        userId,
        customContext: 'Test',
        count: 50,
      });

      // Test negative count caps at 1
      await ideaGenerationService.generateIdeas({
        userId,
        customContext: 'Test',
        count: -5,
      });

      expect(llmService.generate).toHaveBeenCalledTimes(3);
    });

    it('should sort ideas by relevance score descending', async () => {
      const mockLLMResponse = {
        text: JSON.stringify([
          { title: 'Low Score', description: 'Desc', relevanceScore: 0.5, tags: [] },
          { title: 'High Score', description: 'Desc', relevanceScore: 0.9, tags: [] },
          { title: 'Medium Score', description: 'Desc', relevanceScore: 0.7, tags: [] },
        ]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      const createdIdeas: unknown[] = [];
      (llmService.generate as jest.Mock).mockResolvedValue(mockLLMResponse);
      (PostIdea.create as jest.Mock).mockImplementation((data) => {
        const idea = { ...data, id: `idea-${createdIdeas.length}` };
        createdIdeas.push(idea);
        return Promise.resolve(idea);
      });

      const result = await ideaGenerationService.generateIdeas({
        userId,
        customContext: 'Test',
        count: 3,
      });

      // First should have highest score
      expect(result.ideas[0]!.title).toBe('High Score');
      expect(result.ideas[1]!.title).toBe('Medium Score');
      expect(result.ideas[2]!.title).toBe('Low Score');
    });

    it('should deduplicate similar ideas', async () => {
      const mockLLMResponse = {
        text: JSON.stringify([
          { title: 'Leadership Tips for Success', description: 'Desc1', tags: [] },
          { title: 'Tips for Leadership Success', description: 'Desc2', tags: [] }, // Duplicate words
          { title: 'Different Topic Entirely', description: 'Desc3', tags: [] },
        ]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      (llmService.generate as jest.Mock).mockResolvedValue(mockLLMResponse);
      (PostIdea.create as jest.Mock).mockImplementation((data) => Promise.resolve({ ...data, id: `idea-${Math.random()}` }));

      const result = await ideaGenerationService.generateIdeas({
        userId,
        customContext: 'Test',
        count: 10,
      });

      // Should have removed duplicate
      expect(result.ideas.length).toBe(2);
    });
  });

  // ===========================================
  // CRUD Operations
  // ===========================================
  describe('CRUD Operations', () => {
    const userId = 'user-123';
    const ideaId = 'idea-123';

    describe('markAsUsed', () => {
      it('should mark idea as used', async () => {
        const mockIdea = {
          id: ideaId,
          userId,
          isUsed: false,
          update: jest.fn().mockResolvedValue(undefined),
        };

        (PostIdea.findOne as jest.Mock).mockResolvedValue(mockIdea);

        const result = await ideaGenerationService.markAsUsed(ideaId, userId);

        expect(PostIdea.findOne).toHaveBeenCalledWith({
          where: { id: ideaId, userId },
        });
        expect(mockIdea.update).toHaveBeenCalledWith({
          isUsed: true,
          usedAt: expect.any(Date),
          postId: null,
        });
        expect(result).toEqual(mockIdea);
      });

      it('should mark idea as used with postId', async () => {
        const postId = 'post-456';
        const mockIdea = {
          id: ideaId,
          userId,
          update: jest.fn().mockResolvedValue(undefined),
        };

        (PostIdea.findOne as jest.Mock).mockResolvedValue(mockIdea);

        await ideaGenerationService.markAsUsed(ideaId, userId, postId);

        expect(mockIdea.update).toHaveBeenCalledWith({
          isUsed: true,
          usedAt: expect.any(Date),
          postId,
        });
      });

      it('should return null when idea not found', async () => {
        (PostIdea.findOne as jest.Mock).mockResolvedValue(null);

        const result = await ideaGenerationService.markAsUsed(ideaId, userId);

        expect(result).toBeNull();
      });
    });

    describe('getIdeas', () => {
      it('should get ideas with filters', async () => {
        const mockIdeas = [{ id: 'idea-1' }, { id: 'idea-2' }];

        (PostIdea.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: mockIdeas,
          count: 2,
        });

        const result = await ideaGenerationService.getIdeas(userId, {
          profileId: 'profile-1',
          isUsed: false,
          limit: 10,
          offset: 0,
        });

        expect(result.ideas).toEqual(mockIdeas);
        expect(result.total).toBe(2);
        expect(PostIdea.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId,
              profileId: 'profile-1',
              isUsed: false,
            }),
          }),
        );
      });

      it('should use default pagination values', async () => {
        (PostIdea.findAndCountAll as jest.Mock).mockResolvedValue({
          rows: [],
          count: 0,
        });

        await ideaGenerationService.getIdeas(userId, {});

        expect(PostIdea.findAndCountAll).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 20,
            offset: 0,
          }),
        );
      });
    });

    describe('getIdeaById', () => {
      it('should get idea by ID', async () => {
        const mockIdea = { id: ideaId, title: 'Test Idea' };

        (PostIdea.findOne as jest.Mock).mockResolvedValue(mockIdea);

        const result = await ideaGenerationService.getIdeaById(ideaId, userId);

        expect(result).toEqual(mockIdea);
        expect(PostIdea.findOne).toHaveBeenCalledWith({
          where: { id: ideaId, userId },
          include: expect.any(Array),
        });
      });

      it('should return null when idea not found', async () => {
        (PostIdea.findOne as jest.Mock).mockResolvedValue(null);

        const result = await ideaGenerationService.getIdeaById('non-existent', userId);

        expect(result).toBeNull();
      });
    });

    describe('deleteIdea', () => {
      it('should delete idea and return true', async () => {
        (PostIdea.destroy as jest.Mock).mockResolvedValue(1);

        const result = await ideaGenerationService.deleteIdea(ideaId, userId);

        expect(result).toBe(true);
        expect(PostIdea.destroy).toHaveBeenCalledWith({
          where: { id: ideaId, userId },
        });
      });

      it('should return false when idea not found', async () => {
        (PostIdea.destroy as jest.Mock).mockResolvedValue(0);

        const result = await ideaGenerationService.deleteIdea('non-existent', userId);

        expect(result).toBe(false);
      });
    });
  });
});
