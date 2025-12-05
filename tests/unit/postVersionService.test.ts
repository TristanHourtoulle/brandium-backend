/**
 * PostVersionService Unit Tests
 *
 * Comprehensive tests for PostVersionService including:
 * - Creating initial versions
 * - Creating iterations
 * - Selecting versions
 * - Getting versions
 */

import { PostVersionService } from '../../src/services/PostVersionService';
import { Post, PostVersion, Profile, Project, Platform, User, sequelize } from '../../src/models';
import { llmService } from '../../src/services/LLMService';

// Mock LLMService
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
    GenerateResponse: {},
  };
});

const mockGenerate = llmService.generate as jest.Mock;

describe('PostVersionService', () => {
  let service: PostVersionService;
  let testUser: User;
  let testUserId: string;
  let testPost: Post;
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
    // Clean up database in correct order (respecting foreign keys)
    await PostVersion.destroy({ where: {}, force: true });
    await Post.destroy({ where: {}, force: true });
    await Profile.destroy({ where: {}, force: true });
    await Project.destroy({ where: {}, force: true });
    await Platform.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create a test user
    testUser = await User.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword123',
    });
    testUserId = testUser.id;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Test Profile',
      bio: 'Test bio',
      toneTags: ['professional'],
      doRules: ['Be concise'],
      dontRules: ['No jargon'],
      userId: testUserId,
    });

    // Create test project
    testProject = await Project.create({
      name: 'Test Project',
      description: 'Test description',
      audience: 'Developers',
      keyMessages: ['Quality'],
      userId: testUserId,
    });

    // Create test platform
    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
      userId: testUserId,
    });

    // Create test post
    testPost = await Post.create({
      userId: testUserId,
      profileId: testProfile.id,
      projectId: testProject.id,
      platformId: testPlatform.id,
      goal: 'Announce feature',
      rawIdea: 'New feature launched!',
      generatedText: 'Initial generated text',
      totalVersions: 1,
    });

    service = new PostVersionService();
    jest.clearAllMocks();

    // Default mock response
    mockGenerate.mockResolvedValue({
      text: 'Iterated content!',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
  });

  // =====================================
  // createInitialVersion Tests
  // =====================================
  describe('createInitialVersion', () => {
    it('should create initial version with version number 1', async () => {
      const version = await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Generated content',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      });

      expect(version.versionNumber).toBe(1);
      expect(version.generatedText).toBe('Generated content');
      expect(version.isSelected).toBe(true);
      expect(version.iterationPrompt).toBeNull();
    });

    it('should store usage tokens', async () => {
      const version = await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Generated content',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
      });

      expect(version.promptTokens).toBe(100);
      expect(version.completionTokens).toBe(50);
      expect(version.totalTokens).toBe(150);
    });

    it('should update post with currentVersionId', async () => {
      const version = await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Generated content',
      });

      await testPost.reload();
      expect(testPost.currentVersionId).toBe(version.id);
      expect(testPost.totalVersions).toBe(1);
    });

    it('should handle missing usage data', async () => {
      const version = await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Generated content',
      });

      expect(version.promptTokens).toBeNull();
      expect(version.completionTokens).toBeNull();
      expect(version.totalTokens).toBeNull();
    });

    it('should work with transaction', async () => {
      const transaction = await sequelize.transaction();

      try {
        const version = await service.createInitialVersion({
          postId: testPost.id,
          generatedText: 'Generated content',
          transaction,
        });

        await transaction.commit();

        const savedVersion = await PostVersion.findByPk(version.id);
        expect(savedVersion).not.toBeNull();
        expect(savedVersion!.generatedText).toBe('Generated content');
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    });
  });

  // =====================================
  // createIteration Tests
  // =====================================
  describe('createIteration', () => {
    beforeEach(async () => {
      // Create initial version
      await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Initial content',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });
      await testPost.reload();
    });

    it('should create new version with incremented version number', async () => {
      const { version } = await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Make it more professional',
      });

      expect(version.versionNumber).toBe(2);
      expect(version.generatedText).toBe('Iterated content!');
      expect(version.iterationPrompt).toBe('Make it more professional');
      expect(version.isSelected).toBe(true);
    });

    it('should return usage from LLM', async () => {
      const { usage } = await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Make it shorter',
      });

      expect(usage.promptTokens).toBe(100);
      expect(usage.completionTokens).toBe(50);
      expect(usage.totalTokens).toBe(150);
    });

    it('should deselect previous versions', async () => {
      const { version: newVersion } = await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Make it shorter',
      });

      const allVersions = await PostVersion.findAll({
        where: { postId: testPost.id },
        order: [['versionNumber', 'ASC']],
      });

      expect(allVersions).toHaveLength(2);
      expect(allVersions[0]!.isSelected).toBe(false);
      expect(allVersions[1]!.id).toBe(newVersion.id);
      expect(allVersions[1]!.isSelected).toBe(true);
    });

    it('should update post totalVersions and generatedText', async () => {
      await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Make it shorter',
      });

      await testPost.reload();
      expect(testPost.totalVersions).toBe(2);
      expect(testPost.generatedText).toBe('Iterated content!');
    });

    it('should throw error if post not found', async () => {
      await expect(
        service.createIteration({
          postId: '00000000-0000-0000-0000-000000000000',
          userId: testUserId,
          iterationPrompt: 'Make it shorter',
        }),
      ).rejects.toThrow('Post not found or access denied');
    });

    it('should throw error if user does not own post', async () => {
      const otherUserId = '22222222-2222-2222-2222-222222222222';

      await expect(
        service.createIteration({
          postId: testPost.id,
          userId: otherUserId,
          iterationPrompt: 'Make it shorter',
        }),
      ).rejects.toThrow('Post not found or access denied');
    });

    it('should call LLM with correct prompt', async () => {
      await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Add a call to action',
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Add a call to action'),
        }),
      );
    });

    it('should include previous version text in prompt', async () => {
      await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Make changes',
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Initial content'),
        }),
      );
    });

    it('should pass maxTokens to LLM when provided', async () => {
      await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Make changes',
        maxTokens: 500,
      });

      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          maxTokens: 500,
        }),
      );
    });

    it('should support multiple iterations', async () => {
      // Second iteration
      await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'First change',
      });

      mockGenerate.mockResolvedValueOnce({
        text: 'Third version content',
        usage: { promptTokens: 110, completionTokens: 60, totalTokens: 170 },
      });

      // Third iteration
      const { version } = await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Second change',
      });

      expect(version.versionNumber).toBe(3);
      expect(version.generatedText).toBe('Third version content');

      await testPost.reload();
      expect(testPost.totalVersions).toBe(3);
    });
  });

  // =====================================
  // getPostVersions Tests
  // =====================================
  describe('getPostVersions', () => {
    beforeEach(async () => {
      // Create multiple versions
      await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Version 1',
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      });

      await testPost.reload();

      mockGenerate.mockResolvedValueOnce({
        text: 'Version 2',
        usage: { promptTokens: 60, completionTokens: 30, totalTokens: 90 },
      });

      await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Change 1',
      });
    });

    it('should return all versions for a post', async () => {
      const versions = await service.getPostVersions(testPost.id, testUserId);

      expect(versions).toHaveLength(2);
      expect(versions[0]!.versionNumber).toBe(1);
      expect(versions[1]!.versionNumber).toBe(2);
    });

    it('should return versions in ascending order', async () => {
      const versions = await service.getPostVersions(testPost.id, testUserId);

      expect(versions[0]!.versionNumber).toBeLessThan(versions[1]!.versionNumber);
    });

    it('should include all version properties', async () => {
      const versions = await service.getPostVersions(testPost.id, testUserId);
      const version = versions[0]!;

      expect(version).toHaveProperty('id');
      expect(version).toHaveProperty('versionNumber');
      expect(version).toHaveProperty('generatedText');
      expect(version).toHaveProperty('iterationPrompt');
      expect(version).toHaveProperty('isSelected');
      expect(version).toHaveProperty('usage');
      expect(version).toHaveProperty('createdAt');
    });

    it('should throw error if post not found', async () => {
      await expect(
        service.getPostVersions('00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow('Post not found or access denied');
    });

    it('should throw error if user does not own post', async () => {
      const otherUserId = '22222222-2222-2222-2222-222222222222';

      await expect(service.getPostVersions(testPost.id, otherUserId)).rejects.toThrow(
        'Post not found or access denied',
      );
    });
  });

  // =====================================
  // selectVersion Tests
  // =====================================
  describe('selectVersion', () => {
    let version1: PostVersion;
    let version2: PostVersion;

    beforeEach(async () => {
      version1 = await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Version 1',
      });

      await testPost.reload();

      mockGenerate.mockResolvedValueOnce({
        text: 'Version 2',
        usage: { promptTokens: 60, completionTokens: 30, totalTokens: 90 },
      });

      const result = await service.createIteration({
        postId: testPost.id,
        userId: testUserId,
        iterationPrompt: 'Change',
      });
      version2 = result.version;
    });

    it('should select specified version', async () => {
      // Version 2 is currently selected, select version 1
      const selected = await service.selectVersion(testPost.id, version1.id, testUserId);

      expect(selected.id).toBe(version1.id);
      expect(selected.isSelected).toBe(true);
    });

    it('should deselect other versions', async () => {
      await service.selectVersion(testPost.id, version1.id, testUserId);

      await version2.reload();
      expect(version2.isSelected).toBe(false);
    });

    it('should update post currentVersionId', async () => {
      await service.selectVersion(testPost.id, version1.id, testUserId);

      await testPost.reload();
      expect(testPost.currentVersionId).toBe(version1.id);
    });

    it('should update post generatedText to selected version', async () => {
      await service.selectVersion(testPost.id, version1.id, testUserId);

      await testPost.reload();
      expect(testPost.generatedText).toBe('Version 1');
    });

    it('should throw error if post not found', async () => {
      await expect(
        service.selectVersion('00000000-0000-0000-0000-000000000000', version1.id, testUserId),
      ).rejects.toThrow('Post not found or access denied');
    });

    it('should throw error if version not found', async () => {
      await expect(
        service.selectVersion(testPost.id, '00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow('Version not found');
    });

    it('should throw error if user does not own post', async () => {
      const otherUserId = '22222222-2222-2222-2222-222222222222';

      await expect(service.selectVersion(testPost.id, version1.id, otherUserId)).rejects.toThrow(
        'Post not found or access denied',
      );
    });

    it('should return formatted version response', async () => {
      const selected = await service.selectVersion(testPost.id, version1.id, testUserId);

      expect(selected).toHaveProperty('id');
      expect(selected).toHaveProperty('versionNumber');
      expect(selected).toHaveProperty('generatedText');
      expect(selected).toHaveProperty('iterationPrompt');
      expect(selected).toHaveProperty('isSelected');
      expect(selected).toHaveProperty('usage');
      expect(selected).toHaveProperty('createdAt');
    });
  });

  // =====================================
  // getVersion Tests
  // =====================================
  describe('getVersion', () => {
    let version: PostVersion;

    beforeEach(async () => {
      version = await service.createInitialVersion({
        postId: testPost.id,
        generatedText: 'Test version',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });
    });

    it('should return version by ID', async () => {
      const result = await service.getVersion(version.id, testUserId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(version.id);
      expect(result!.generatedText).toBe('Test version');
    });

    it('should return null if version not found', async () => {
      const result = await service.getVersion(
        '00000000-0000-0000-0000-000000000000',
        testUserId,
      );

      expect(result).toBeNull();
    });

    it('should return null if user does not own post', async () => {
      const otherUserId = '22222222-2222-2222-2222-222222222222';
      const result = await service.getVersion(version.id, otherUserId);

      expect(result).toBeNull();
    });

    it('should return formatted version response', async () => {
      const result = await service.getVersion(version.id, testUserId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('versionNumber');
      expect(result).toHaveProperty('generatedText');
      expect(result).toHaveProperty('iterationPrompt');
      expect(result).toHaveProperty('isSelected');
      expect(result).toHaveProperty('usage');
      expect(result!.usage).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      });
    });
  });
});
