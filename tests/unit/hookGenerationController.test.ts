/**
 * HookGenerationController Unit Tests
 */

import { Request, Response, NextFunction } from 'express';
import * as HookGenerationController from '../../src/controllers/HookGenerationController';
import { hookGenerationService } from '../../src/services/HookGenerationService';
import { Profile } from '../../src/models/Profile';
import { RateLimitError, LLMServiceError } from '../../src/services/LLMService';

// Mock dependencies
jest.mock('../../src/services/HookGenerationService', () => ({
  hookGenerationService: {
    generateHooks: jest.fn(),
    generateHooksFromPost: jest.fn(),
  },
}));

jest.mock('../../src/models/Profile');

// Mock the dynamic import of Post model
const mockPostFindOne = jest.fn();
jest.mock('../../src/models', () => ({
  Post: {
    findOne: mockPostFindOne,
  },
}));

const mockGenerateHooks = hookGenerationService.generateHooks as jest.Mock;
const mockGenerateHooksFromPost = hookGenerationService.generateHooksFromPost as jest.Mock;
const mockProfileFindOne = Profile.findOne as jest.Mock;

describe('HookGenerationController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  const mockUserId = '12345678-1234-1234-1234-123456789012';
  const mockProfileId = 'profile-uuid';
  const mockPostId = 'post-uuid';

  const mockHooks = [
    { type: 'question', text: 'Ever wonder why?', estimatedEngagement: 9 },
    { type: 'stat', text: '73% of people...', estimatedEngagement: 8 },
    { type: 'story', text: 'Last year, I...', estimatedEngagement: 9 },
    { type: 'bold_opinion', text: 'Stop doing X.', estimatedEngagement: 8 },
  ];

  beforeEach(() => {
    req = {
      user: { id: mockUserId } as any,
      body: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();

    // Reset mocks
    mockGenerateHooks.mockReset();
    mockGenerateHooksFromPost.mockReset();
    mockProfileFindOne.mockReset();
    mockPostFindOne.mockReset();
  });

  describe('generateHooks - rawIdea mode (legacy)', () => {
    it('should generate hooks from rawIdea successfully', async () => {
      req.body = {
        rawIdea: 'Share lessons about entrepreneurship',
        count: 4,
      };

      mockGenerateHooks.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockGenerateHooks).toHaveBeenCalledWith({
        rawIdea: 'Share lessons about entrepreneurship',
        goal: undefined,
        profile: undefined,
        count: 4,
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hooks generated successfully',
        data: {
          hooks: mockHooks,
          totalHooks: 4,
          source: 'rawIdea',
        },
      });
    });

    it('should use default count of 4 when not provided', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      mockGenerateHooks.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockGenerateHooks).toHaveBeenCalledWith({
        rawIdea: 'Test idea',
        goal: undefined,
        profile: undefined,
        count: 4,
      });
    });

    it('should include goal when provided', async () => {
      req.body = {
        rawIdea: 'Test idea',
        goal: 'Inspire and educate',
      };

      mockGenerateHooks.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockGenerateHooks).toHaveBeenCalledWith({
        rawIdea: 'Test idea',
        goal: 'Inspire and educate',
        profile: undefined,
        count: 4,
      });
    });

    it('should include profile context when profileId is provided', async () => {
      req.body = {
        rawIdea: 'Test idea',
        profileId: mockProfileId,
      };

      const mockProfile = {
        id: mockProfileId,
        name: 'John Doe',
        bio: 'Developer',
        toneTags: ['professional', 'friendly'],
      };

      mockProfileFindOne.mockResolvedValueOnce(mockProfile);
      mockGenerateHooks.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockProfileFindOne).toHaveBeenCalledWith({
        where: { id: mockProfileId, userId: mockUserId },
      });

      expect(mockGenerateHooks).toHaveBeenCalledWith({
        rawIdea: 'Test idea',
        goal: undefined,
        profile: {
          name: 'John Doe',
          bio: 'Developer',
          toneTags: ['professional', 'friendly'],
        },
        count: 4,
      });
    });

    it('should trim rawIdea and goal before processing', async () => {
      req.body = {
        rawIdea: '  Test idea with spaces  ',
        goal: '  Educate  ',
      };

      mockGenerateHooks.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockGenerateHooks).toHaveBeenCalledWith({
        rawIdea: 'Test idea with spaces',
        goal: 'Educate',
        profile: undefined,
        count: 4,
      });
    });
  });

  describe('generateHooks - postId mode (new)', () => {
    it('should generate hooks from existing post successfully', async () => {
      req.body = {
        postId: mockPostId,
        variants: 2,
      };

      const mockPost = {
        id: mockPostId,
        generatedText: 'The 3 mistakes that cost me 50K€...',
        goal: 'Educate founders',
        profileId: null,
      };

      mockPostFindOne.mockResolvedValueOnce(mockPost);
      mockGenerateHooksFromPost.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockPostFindOne).toHaveBeenCalledWith({
        where: { id: mockPostId, userId: mockUserId },
      });

      expect(mockGenerateHooksFromPost).toHaveBeenCalledWith({
        postContent: 'The 3 mistakes that cost me 50K€...',
        goal: 'Educate founders',
        profile: undefined,
        variants: 2,
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Hooks generated successfully',
        data: {
          hooks: mockHooks,
          totalHooks: 4,
          source: 'post',
        },
      });
    });

    it('should use default variants of 2 when not provided', async () => {
      req.body = {
        postId: mockPostId,
      };

      const mockPost = {
        id: mockPostId,
        generatedText: 'Test post content',
        goal: null,
        profileId: null,
      };

      mockPostFindOne.mockResolvedValueOnce(mockPost);
      mockGenerateHooksFromPost.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockGenerateHooksFromPost).toHaveBeenCalledWith({
        postContent: 'Test post content',
        goal: undefined,
        profile: undefined,
        variants: 2,
      });
    });

    it('should use post profile when no profileId is provided', async () => {
      req.body = {
        postId: mockPostId,
      };

      const mockPost = {
        id: mockPostId,
        generatedText: 'Test content',
        goal: 'Test goal',
        profileId: mockProfileId,
      };

      const mockProfile = {
        id: mockProfileId,
        name: 'Jane Smith',
        bio: 'Entrepreneur',
        toneTags: ['inspiring'],
      };

      mockPostFindOne.mockResolvedValueOnce(mockPost);
      mockProfileFindOne.mockResolvedValueOnce(mockProfile);
      mockGenerateHooksFromPost.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockProfileFindOne).toHaveBeenCalledWith({
        where: { id: mockProfileId, userId: mockUserId },
      });

      expect(mockGenerateHooksFromPost).toHaveBeenCalledWith({
        postContent: 'Test content',
        goal: 'Test goal',
        profile: {
          name: 'Jane Smith',
          bio: 'Entrepreneur',
          toneTags: ['inspiring'],
        },
        variants: 2,
      });
    });

    it('should override post profile with provided profileId', async () => {
      const customProfileId = 'custom-profile-uuid';

      req.body = {
        postId: mockPostId,
        profileId: customProfileId,
      };

      const mockPost = {
        id: mockPostId,
        generatedText: 'Test content',
        goal: 'Test goal',
        profileId: mockProfileId, // Different from provided profileId
      };

      const customProfile = {
        id: customProfileId,
        name: 'Custom Profile',
        bio: 'Custom bio',
        toneTags: ['custom'],
      };

      mockPostFindOne.mockResolvedValueOnce(mockPost);
      mockProfileFindOne.mockResolvedValueOnce(customProfile);
      mockGenerateHooksFromPost.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      // Should use custom profile, not post's profile
      expect(mockProfileFindOne).toHaveBeenCalledWith({
        where: { id: customProfileId, userId: mockUserId },
      });

      expect(mockGenerateHooksFromPost).toHaveBeenCalledWith({
        postContent: 'Test content',
        goal: 'Test goal',
        profile: {
          name: 'Custom Profile',
          bio: 'Custom bio',
          toneTags: ['custom'],
        },
        variants: 2,
      });
    });

    it('should override post goal with provided goal', async () => {
      req.body = {
        postId: mockPostId,
        goal: 'Override goal',
      };

      const mockPost = {
        id: mockPostId,
        generatedText: 'Test content',
        goal: 'Original goal',
        profileId: null,
      };

      mockPostFindOne.mockResolvedValueOnce(mockPost);
      mockGenerateHooksFromPost.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockGenerateHooksFromPost).toHaveBeenCalledWith({
        postContent: 'Test content',
        goal: 'Override goal',
        profile: undefined,
        variants: 2,
      });
    });

    it('should handle profile with null bio', async () => {
      req.body = {
        postId: mockPostId,
        profileId: mockProfileId,
      };

      const mockPost = {
        id: mockPostId,
        generatedText: 'Test content',
        goal: null,
        profileId: null,
      };

      const mockProfile = {
        id: mockProfileId,
        name: 'John Doe',
        bio: null,
        toneTags: ['professional'],
      };

      mockPostFindOne.mockResolvedValueOnce(mockPost);
      mockProfileFindOne.mockResolvedValueOnce(mockProfile);
      mockGenerateHooksFromPost.mockResolvedValueOnce(mockHooks);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockGenerateHooksFromPost).toHaveBeenCalledWith({
        postContent: 'Test content',
        goal: undefined,
        profile: {
          name: 'John Doe',
          bio: undefined,
          toneTags: ['professional'],
        },
        variants: 2,
      });
    });
  });

  describe('Validation errors', () => {
    it('should return 400 if neither rawIdea nor postId is provided', async () => {
      req.body = {
        goal: 'Test goal',
      };

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'Either rawIdea or postId is required',
      });
    });

    it('should return 400 if count is less than 1', async () => {
      req.body = {
        rawIdea: 'Test idea',
        count: 0,
      };

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'count must be between 1 and 10',
      });
    });

    it('should return 400 if count is greater than 10', async () => {
      req.body = {
        rawIdea: 'Test idea',
        count: 11,
      };

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'count must be between 1 and 10',
      });
    });

    it('should return 400 if variants is less than 1', async () => {
      req.body = {
        postId: mockPostId,
        variants: 0,
      };

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'variants must be between 1 and 3',
      });
    });

    it('should return 400 if variants is greater than 3', async () => {
      req.body = {
        postId: mockPostId,
        variants: 4,
      };

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Error',
        message: 'variants must be between 1 and 3',
      });
    });
  });

  describe('404 errors', () => {
    it('should return 404 if profile is not found', async () => {
      req.body = {
        rawIdea: 'Test idea',
        profileId: mockProfileId,
      };

      mockProfileFindOne.mockResolvedValueOnce(null);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Profile not found or access denied',
      });
    });

    it('should return 404 if post is not found', async () => {
      req.body = {
        postId: mockPostId,
      };

      mockPostFindOne.mockResolvedValueOnce(null);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Post not found or access denied',
      });
    });

    it('should return 404 if post belongs to different user', async () => {
      req.body = {
        postId: mockPostId,
      };

      // findOne returns null because userId doesn't match
      mockPostFindOne.mockResolvedValueOnce(null);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(mockPostFindOne).toHaveBeenCalledWith({
        where: { id: mockPostId, userId: mockUserId },
      });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Post not found or access denied',
      });
    });
  });

  describe('Error handling', () => {
    it('should handle RateLimitError with 429 status', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const rateLimitError = new RateLimitError('Rate limit exceeded', 60);

      mockGenerateHooks.mockRejectedValueOnce(rateLimitError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Rate Limit Exceeded',
        message: 'Rate limit exceeded',
        retryAfter: 60,
      });
    });

    it('should handle LLMServiceError with appropriate status codes', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const llmError = new LLMServiceError(
        'API key is missing',
        'API_KEY_MISSING',
      );

      mockGenerateHooks.mockRejectedValueOnce(llmError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Generation Error',
        message: 'API key is missing',
        code: 'API_KEY_MISSING',
      });
    });

    it('should handle INVALID_API_KEY error with 503', async () => {
      req.body = {
        postId: mockPostId,
      };

      const mockPost = {
        id: mockPostId,
        generatedText: 'Test',
        goal: null,
        profileId: null,
      };

      mockPostFindOne.mockResolvedValueOnce(mockPost);

      const llmError = new LLMServiceError(
        'Invalid API key',
        'INVALID_API_KEY',
      );

      mockGenerateHooksFromPost.mockRejectedValueOnce(llmError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Generation Error',
        message: 'Invalid API key',
        code: 'INVALID_API_KEY',
      });
    });

    it('should handle SERVICE_UNAVAILABLE error with 503', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const llmError = new LLMServiceError(
        'Service unavailable',
        'SERVICE_UNAVAILABLE',
      );

      mockGenerateHooks.mockRejectedValueOnce(llmError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(503);
    });

    it('should handle EMPTY_RESPONSE error with 500', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const llmError = new LLMServiceError('Empty response', 'EMPTY_RESPONSE');

      mockGenerateHooks.mockRejectedValueOnce(llmError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle API_ERROR with 502', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const llmError = new LLMServiceError('API error', 'API_ERROR');

      mockGenerateHooks.mockRejectedValueOnce(llmError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(502);
    });

    it('should handle GENERATION_FAILED error with 500', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const llmError = new LLMServiceError(
        'Generation failed',
        'GENERATION_FAILED',
      );

      mockGenerateHooks.mockRejectedValueOnce(llmError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should handle unknown LLM error codes with 500', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const llmError = new LLMServiceError('Unknown error', 'UNKNOWN_CODE');

      mockGenerateHooks.mockRejectedValueOnce(llmError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Generation Error',
        message: 'Unknown error',
        code: 'UNKNOWN_CODE',
      });
    });

    it('should pass other errors to next middleware', async () => {
      req.body = {
        rawIdea: 'Test idea',
      };

      const genericError = new Error('Database connection failed');

      mockGenerateHooks.mockRejectedValueOnce(genericError);

      await HookGenerationController.generateHooks(
        req as Request,
        res as Response,
        next,
      );

      expect(next).toHaveBeenCalledWith(genericError);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
