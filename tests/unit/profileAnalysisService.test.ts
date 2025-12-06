/**
 * ProfileAnalysisService Unit Tests
 */

import {
  buildAnalysisPrompt,
  parseAnalysisResponse,
  validatePostsForAnalysis,
  calculateConfidence,
  StyleAnalysisResult,
} from '../../src/utils/analysisPromptBuilder';
import { HistoricalPost } from '../../src/models';

/**
 * Create mock historical posts for testing
 */
function createMockPosts(count: number): HistoricalPost[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `post-${i}`,
    userId: 'user-1',
    profileId: 'profile-1',
    platformId: i % 2 === 0 ? 'platform-1' : null,
    content: `This is historical post number ${i + 1}. It contains some interesting content about technology and innovation.`,
    publishedAt: new Date(2024, 0, i + 1),
    externalUrl: `https://example.com/post/${i}`,
    engagement: {
      likes: 100 + i * 10,
      comments: 10 + i,
      shares: 5 + i,
    },
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as unknown as HistoricalPost[];
}

describe('analysisPromptBuilder', () => {
  describe('buildAnalysisPrompt', () => {
    it('should build a prompt with all posts', () => {
      const posts = createMockPosts(5);
      const prompt = buildAnalysisPrompt(posts);

      expect(prompt).toContain('Analyze Writing Style');
      expect(prompt).toContain('5 social media posts');
      expect(prompt).toContain('Post 1');
      expect(prompt).toContain('Post 5');
    });

    it('should include post content', () => {
      const posts = createMockPosts(3);
      const prompt = buildAnalysisPrompt(posts);

      expect(prompt).toContain('historical post number 1');
      expect(prompt).toContain('historical post number 2');
      expect(prompt).toContain('historical post number 3');
    });

    it('should include engagement data when available', () => {
      const posts = createMockPosts(2);
      const prompt = buildAnalysisPrompt(posts);

      expect(prompt).toContain('likes');
      expect(prompt).toContain('comments');
      expect(prompt).toContain('shares');
    });

    it('should include published date when available', () => {
      const posts = createMockPosts(2);
      const prompt = buildAnalysisPrompt(posts);

      // Check that ISO date format is present (timezone may affect exact date)
      expect(prompt).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(prompt).toContain('2024-');
    });

    it('should include JSON output format instructions', () => {
      const posts = createMockPosts(5);
      const prompt = buildAnalysisPrompt(posts);

      expect(prompt).toContain('toneTags');
      expect(prompt).toContain('doRules');
      expect(prompt).toContain('dontRules');
      expect(prompt).toContain('styleInsights');
    });
  });

  describe('parseAnalysisResponse', () => {
    const validResponse = JSON.stringify({
      toneTags: ['professional', 'friendly', 'technical'],
      doRules: ['Use concrete examples', 'Start with a question'],
      dontRules: ['Avoid jargon', 'No excessive caps'],
      styleInsights: {
        averageLength: 'medium',
        emojiUsage: 'minimal',
        hashtagUsage: 'moderate',
        questionUsage: 'high',
        callToActionUsage: 'moderate',
      },
    });

    it('should parse valid JSON response', () => {
      const result = parseAnalysisResponse(validResponse, 10);

      expect(result).not.toBeNull();
      expect(result?.toneTags).toEqual(['professional', 'friendly', 'technical']);
      expect(result?.doRules).toHaveLength(2);
      expect(result?.dontRules).toHaveLength(2);
    });

    it('should extract JSON from text with surrounding content', () => {
      const responseWithText = `Here is the analysis:\n${validResponse}\n\nLet me know if you need more details.`;
      const result = parseAnalysisResponse(responseWithText, 10);

      expect(result).not.toBeNull();
      expect(result?.toneTags).toContain('professional');
    });

    it('should return null for invalid JSON', () => {
      const result = parseAnalysisResponse('Not valid JSON', 10);
      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const incomplete = JSON.stringify({
        toneTags: ['test'],
        // Missing doRules, dontRules, styleInsights
      });
      const result = parseAnalysisResponse(incomplete, 10);
      expect(result).toBeNull();
    });

    it('should validate and normalize styleInsights values', () => {
      const responseWithInvalidInsights = JSON.stringify({
        toneTags: ['test'],
        doRules: ['rule'],
        dontRules: ['dont'],
        styleInsights: {
          averageLength: 'invalid',
          emojiUsage: 'wrong',
          hashtagUsage: 'moderate',
          questionUsage: 'high',
          callToActionUsage: 'wrong',
        },
      });

      const result = parseAnalysisResponse(responseWithInvalidInsights, 10);

      expect(result).not.toBeNull();
      // Invalid values should be replaced with defaults
      expect(result?.styleInsights.averageLength).toBe('medium');
      expect(result?.styleInsights.emojiUsage).toBe('minimal');
      expect(result?.styleInsights.hashtagUsage).toBe('moderate');
      expect(result?.styleInsights.callToActionUsage).toBe('low');
    });

    it('should limit array lengths to 10 items', () => {
      const responseWithManyItems = JSON.stringify({
        toneTags: Array(15).fill('tag'),
        doRules: Array(15).fill('rule'),
        dontRules: Array(15).fill('dont'),
        styleInsights: {
          averageLength: 'medium',
          emojiUsage: 'minimal',
          hashtagUsage: 'none',
          questionUsage: 'low',
          callToActionUsage: 'low',
        },
      });

      const result = parseAnalysisResponse(responseWithManyItems, 10);

      expect(result?.toneTags).toHaveLength(10);
      expect(result?.doRules).toHaveLength(10);
      expect(result?.dontRules).toHaveLength(10);
    });

    it('should calculate confidence based on post count', () => {
      const result = parseAnalysisResponse(validResponse, 15);
      expect(result?.confidence).toBe(0.85); // 15 posts = 0.85 confidence
    });
  });

  describe('validatePostsForAnalysis', () => {
    it('should return valid for 5 or more posts', () => {
      const posts = createMockPosts(5);
      const result = validatePostsForAnalysis(posts);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty array', () => {
      const result = validatePostsForAnalysis([]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No historical posts');
    });

    it('should return invalid for less than 5 posts', () => {
      const posts = createMockPosts(3);
      const result = validatePostsForAnalysis(posts);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum 5 posts');
      expect(result.error).toContain('3 posts');
    });

    it('should reject posts with too short content', () => {
      const shortPosts = Array.from({ length: 6 }, (_, i) => ({
        content: 'Hi', // Too short
      })) as unknown as HistoricalPost[];

      const result = validatePostsForAnalysis(shortPosts);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('substantial content');
    });

    it('should accept posts with minimum content length', () => {
      const posts = Array.from({ length: 5 }, (_, i) => ({
        content: 'This is a post with enough content to be valid for analysis purposes.',
      })) as unknown as HistoricalPost[];

      const result = validatePostsForAnalysis(posts);
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateConfidence', () => {
    it('should return 0.3 for less than 5 posts', () => {
      expect(calculateConfidence(4)).toBe(0.3);
      expect(calculateConfidence(1)).toBe(0.3);
    });

    it('should return 0.5 for 5-9 posts', () => {
      expect(calculateConfidence(5)).toBe(0.5);
      expect(calculateConfidence(9)).toBe(0.5);
    });

    it('should return 0.7 for 10-14 posts', () => {
      expect(calculateConfidence(10)).toBe(0.7);
      expect(calculateConfidence(14)).toBe(0.7);
    });

    it('should return 0.85 for 15-24 posts', () => {
      expect(calculateConfidence(15)).toBe(0.85);
      expect(calculateConfidence(24)).toBe(0.85);
    });

    it('should return 0.95 for 25+ posts', () => {
      expect(calculateConfidence(25)).toBe(0.95);
      expect(calculateConfidence(100)).toBe(0.95);
    });
  });
});

describe('StyleAnalysisResult', () => {
  it('should have correct structure', () => {
    const result: StyleAnalysisResult = {
      toneTags: ['professional'],
      doRules: ['Use examples'],
      dontRules: ['Avoid jargon'],
      styleInsights: {
        averageLength: 'medium',
        emojiUsage: 'minimal',
        hashtagUsage: 'moderate',
        questionUsage: 'high',
        callToActionUsage: 'moderate',
      },
      confidence: 0.7,
    };

    expect(result.toneTags).toBeInstanceOf(Array);
    expect(result.doRules).toBeInstanceOf(Array);
    expect(result.dontRules).toBeInstanceOf(Array);
    expect(result.styleInsights).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// =====================================
// ProfileAnalysisService Class Tests
// =====================================
import {
  ProfileAnalysisService,
  ProfileAnalysisError,
} from '../../src/services/ProfileAnalysisService';
import { LLMService, LLMServiceError } from '../../src/services/LLMService';
import { Profile } from '../../src/models';

// Mock the models
jest.mock('../../src/models', () => ({
  HistoricalPost: {
    findAll: jest.fn(),
  },
  Profile: jest.fn(),
}));

// Mock LLMService
jest.mock('../../src/services/LLMService', () => ({
  LLMService: jest.fn().mockImplementation(() => ({
    generate: jest.fn(),
  })),
  LLMServiceError: class LLMServiceError extends Error {
    code: string;
    constructor(message: string, code: string) {
      super(message);
      this.code = code;
    }
  },
}));

describe('ProfileAnalysisService', () => {
  let service: ProfileAnalysisService;
  let mockLLMService: jest.Mocked<LLMService>;

  const validAnalysisResponse = JSON.stringify({
    toneTags: ['professional', 'friendly'],
    doRules: ['Use examples', 'Be concise'],
    dontRules: ['Avoid jargon'],
    styleInsights: {
      averageLength: 'medium',
      emojiUsage: 'minimal',
      hashtagUsage: 'none',
      questionUsage: 'moderate',
      callToActionUsage: 'low',
    },
  });

  const mockPosts = [
    {
      id: 'post-1',
      profileId: 'profile-1',
      userId: 'user-1',
      platformId: 'platform-1',
      content: 'This is a test post with enough content to pass validation checks.',
      engagement: { likes: 10, comments: 5 },
    },
    {
      id: 'post-2',
      profileId: 'profile-1',
      userId: 'user-1',
      platformId: null,
      content: 'Another test post with substantial content for meaningful analysis.',
      engagement: {},
    },
    {
      id: 'post-3',
      profileId: 'profile-1',
      userId: 'user-1',
      platformId: 'platform-1',
      content: 'Third test post that contains interesting insights about technology.',
      engagement: { likes: 20 },
    },
    {
      id: 'post-4',
      profileId: 'profile-1',
      userId: 'user-1',
      platformId: null,
      content: 'Fourth post with valuable content for the analysis system to process.',
      engagement: null,
    },
    {
      id: 'post-5',
      profileId: 'profile-1',
      userId: 'user-1',
      platformId: 'platform-2',
      content: 'Fifth and final test post completing our minimum requirement set.',
      engagement: { shares: 3 },
    },
  ];

  const mockProfile = {
    id: 'profile-1',
    userId: 'user-1',
    name: 'Test Profile',
    toneTags: ['existing-tag'],
    doRules: ['existing-do'],
    dontRules: ['existing-dont'],
    update: jest.fn().mockResolvedValue(true),
  } as unknown as Profile;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLLMService = {
      generate: jest.fn(),
    } as unknown as jest.Mocked<LLMService>;

    service = new ProfileAnalysisService(mockLLMService);
  });

  describe('analyzePostsForProfile', () => {
    it('should analyze posts and return suggestions', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockResolvedValue({
        text: validAnalysisResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await service.analyzePostsForProfile(mockProfile);

      expect(result.totalPostsAnalyzed).toBe(5);
      expect(result.applied).toBe(false);
      expect(result.analysis.toneTags).toContain('professional');
      expect(result.analysis.doRules).toContain('Use examples');
    });

    it('should filter by platformId when provided', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockResolvedValue({
        text: validAnalysisResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.analyzePostsForProfile(mockProfile, { platformId: 'platform-1' });

      expect(HistoricalPost.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            platformId: 'platform-1',
          }),
        }),
      );
    });

    it('should auto-apply when autoApply is true', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockResolvedValue({
        text: validAnalysisResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await service.analyzePostsForProfile(mockProfile, { autoApply: true });

      expect(result.applied).toBe(true);
      expect(result.updatedProfile).toBeDefined();
      expect(mockProfile.update).toHaveBeenCalled();
    });

    it('should throw INSUFFICIENT_POSTS when not enough posts', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue([mockPosts[0], mockPosts[1]]); // Only 2 posts

      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toThrow(ProfileAnalysisError);
      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toMatchObject({
        code: 'INSUFFICIENT_POSTS',
      });
    });

    it('should throw PARSE_ERROR when AI response is invalid', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockResolvedValue({
        text: 'Invalid JSON response',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toThrow(ProfileAnalysisError);
      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toMatchObject({
        code: 'PARSE_ERROR',
      });
    });

    it('should rethrow ProfileAnalysisError as-is', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockRejectedValue(new ProfileAnalysisError('Test error', 'TEST_CODE'));

      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toMatchObject({
        code: 'TEST_CODE',
      });
    });

    it('should wrap LLMServiceError with proper code', async () => {
      const { HistoricalPost } = require('../../src/models');
      const { LLMServiceError } = require('../../src/services/LLMService');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockRejectedValue(new LLMServiceError('API error', 'API_ERROR'));

      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toThrow(ProfileAnalysisError);
      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toMatchObject({
        code: 'API_ERROR',
      });
    });

    it('should wrap unknown errors with ANALYSIS_FAILED code', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockRejectedValue(new Error('Unknown error'));

      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toThrow(ProfileAnalysisError);
      await expect(service.analyzePostsForProfile(mockProfile)).rejects.toMatchObject({
        code: 'ANALYSIS_FAILED',
      });
    });

    it('should respect maxPosts option', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);
      mockLLMService.generate.mockResolvedValue({
        text: validAnalysisResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.analyzePostsForProfile(mockProfile, { maxPosts: 10 });

      expect(HistoricalPost.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
        }),
      );
    });
  });

  describe('applyAnalysisToProfile', () => {
    const analysis: StyleAnalysisResult = {
      toneTags: ['new-tag', 'Existing-Tag'], // Case-insensitive duplicate
      doRules: ['new-do'],
      dontRules: ['new-dont', 'existing-dont'], // Duplicate
      styleInsights: {
        averageLength: 'medium',
        emojiUsage: 'minimal',
        hashtagUsage: 'none',
        questionUsage: 'low',
        callToActionUsage: 'low',
      },
      confidence: 0.8,
    };

    it('should merge arrays without duplicates (case-insensitive)', async () => {
      await service.applyAnalysisToProfile(mockProfile, analysis);

      expect(mockProfile.update).toHaveBeenCalledWith({
        toneTags: ['existing-tag', 'new-tag'], // Existing-Tag not added (case-insensitive)
        doRules: ['existing-do', 'new-do'],
        dontRules: ['existing-dont', 'new-dont'], // existing-dont not duplicated
      });
    });

    it('should return the updated profile', async () => {
      const result = await service.applyAnalysisToProfile(mockProfile, analysis);
      expect(result).toBe(mockProfile);
    });
  });

  describe('getAnalysisStats', () => {
    it('should return correct stats for posts', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);

      const stats = await service.getAnalysisStats('profile-1', 'user-1');

      expect(stats.totalPosts).toBe(5);
      expect(stats.hasEnoughPosts).toBe(true);
      expect(stats.minimumRequired).toBe(5);
      expect(stats.postsWithEngagement).toBe(3); // posts with non-empty engagement
      expect(stats.platforms.length).toBeGreaterThan(0);
    });

    it('should return hasEnoughPosts=false when less than 5 posts', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue([mockPosts[0], mockPosts[1]]);

      const stats = await service.getAnalysisStats('profile-1', 'user-1');

      expect(stats.totalPosts).toBe(2);
      expect(stats.hasEnoughPosts).toBe(false);
    });

    it('should correctly count posts per platform', async () => {
      const { HistoricalPost } = require('../../src/models');
      HistoricalPost.findAll.mockResolvedValue(mockPosts);

      const stats = await service.getAnalysisStats('profile-1', 'user-1');

      // mockPosts has: platform-1 (2), null (2), platform-2 (1)
      const platform1 = stats.platforms.find((p) => p.platformId === 'platform-1');
      const noplatform = stats.platforms.find((p) => p.platformId === null);
      const platform2 = stats.platforms.find((p) => p.platformId === 'platform-2');

      expect(platform1?.count).toBe(2);
      expect(noplatform?.count).toBe(2);
      expect(platform2?.count).toBe(1);
    });

    it('should count posts with engagement correctly', async () => {
      const { HistoricalPost } = require('../../src/models');
      // Only 2 posts with engagement data
      HistoricalPost.findAll.mockResolvedValue([
        { ...mockPosts[0], engagement: { likes: 10 } },
        { ...mockPosts[1], engagement: {} }, // empty engagement
        { ...mockPosts[2], engagement: null }, // null engagement
      ]);

      const stats = await service.getAnalysisStats('profile-1', 'user-1');

      expect(stats.postsWithEngagement).toBe(1); // Only first post has engagement
    });
  });
});

describe('ProfileAnalysisError', () => {
  it('should create error with default code', () => {
    const error = new ProfileAnalysisError('Test message');
    expect(error.message).toBe('Test message');
    expect(error.code).toBe('ANALYSIS_ERROR');
    expect(error.name).toBe('ProfileAnalysisError');
  });

  it('should create error with custom code', () => {
    const error = new ProfileAnalysisError('Test message', 'CUSTOM_CODE');
    expect(error.code).toBe('CUSTOM_CODE');
  });
});
