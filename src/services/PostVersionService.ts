import { Transaction, Op } from 'sequelize';
import { Post, PostVersion, Profile, Project, Platform } from '../models';
import { llmService, GenerateResponse } from './LLMService';
import { buildIterationPrompt } from '../utils/promptBuilder';
import { isPlatformSupported, OPENAI } from '../config/constants';

/**
 * Parameters for creating an initial version
 */
export interface CreateInitialVersionParams {
  postId: string;
  generatedText: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  transaction?: Transaction;
}

/**
 * Parameters for creating an iteration
 */
export interface CreateIterationParams {
  postId: string;
  userId: string;
  iterationPrompt: string;
  maxTokens?: number;
}

/**
 * Version response data
 */
export interface VersionResponse {
  id: string;
  versionNumber: number;
  generatedText: string;
  iterationPrompt: string | null;
  isSelected: boolean;
  usage: {
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
  };
  createdAt: Date;
}

/**
 * Service for managing post versions and iterations
 */
export class PostVersionService {
  /**
   * Create the initial version for a post (called after first generation)
   */
  async createInitialVersion(params: CreateInitialVersionParams): Promise<PostVersion> {
    const { postId, generatedText, usage, transaction } = params;

    const version = await PostVersion.create(
      {
        postId,
        versionNumber: 1,
        generatedText,
        iterationPrompt: null,
        isSelected: true,
        promptTokens: usage?.promptTokens ?? null,
        completionTokens: usage?.completionTokens ?? null,
        totalTokens: usage?.totalTokens ?? null,
      },
      { transaction },
    );

    // Update post with currentVersionId
    await Post.update(
      {
        currentVersionId: version.id,
        totalVersions: 1,
      },
      {
        where: { id: postId },
        transaction,
      },
    );

    return version;
  }

  /**
   * Create a new iteration of a post based on user feedback
   */
  async createIteration(params: CreateIterationParams): Promise<{
    version: PostVersion;
    usage: GenerateResponse['usage'];
  }> {
    const { postId, userId, iterationPrompt, maxTokens } = params;

    // Fetch post with all context
    const post = await Post.findOne({
      where: { id: postId, userId },
      include: [
        { model: Profile, as: 'profile' },
        { model: Project, as: 'project' },
        { model: Platform, as: 'platform' },
        {
          model: PostVersion,
          as: 'currentVersion',
        },
      ],
    });

    if (!post) {
      throw new Error('Post not found or access denied');
    }

    // LinkedIn-only validation for iterations
    if (post.platform && !isPlatformSupported(post.platform.name)) {
      throw new Error(
        `Iterations are only supported for LinkedIn posts. This post uses "${post.platform.name}".`,
      );
    }

    // Get the current/latest version text
    const previousText = post.currentVersion?.generatedText || post.generatedText;

    // Build the iteration prompt
    const prompt = buildIterationPrompt({
      profile: post.profile,
      project: post.project,
      platform: post.platform,
      goal: post.goal,
      rawIdea: post.rawIdea,
      previousText,
      iterationPrompt,
    });

    // Generate new content with iteration-specific settings (lower temperature for precision)
    const result = await llmService.generate({
      prompt,
      maxTokens: maxTokens || OPENAI.ITERATION.maxTokens,
      temperature: OPENAI.ITERATION.temperature,
    });

    // Calculate new version number
    const newVersionNumber = post.totalVersions + 1;

    // Create new version and update post in a transaction
    const version = await PostVersion.create({
      postId,
      versionNumber: newVersionNumber,
      generatedText: result.text,
      iterationPrompt,
      isSelected: true,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    });

    // Deselect previous versions
    await PostVersion.update(
      { isSelected: false },
      {
        where: {
          postId,
          id: { [Op.ne]: version.id },
        },
      },
    );

    // Update post
    await post.update({
      currentVersionId: version.id,
      totalVersions: newVersionNumber,
      generatedText: result.text, // Keep generatedText in sync with current version
    });

    return {
      version,
      usage: result.usage,
    };
  }

  /**
   * Get all versions for a post
   */
  async getPostVersions(postId: string, userId: string): Promise<VersionResponse[]> {
    const post = await Post.findOne({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new Error('Post not found or access denied');
    }

    const versions = await PostVersion.findAll({
      where: { postId },
      order: [['versionNumber', 'ASC']],
    });

    return versions.map((v) => this.formatVersionResponse(v));
  }

  /**
   * Select a specific version as the current one
   */
  async selectVersion(
    postId: string,
    versionId: string,
    userId: string,
  ): Promise<VersionResponse> {
    // Verify post ownership
    const post = await Post.findOne({
      where: { id: postId, userId },
    });

    if (!post) {
      throw new Error('Post not found or access denied');
    }

    // Find the version
    const version = await PostVersion.findOne({
      where: { id: versionId, postId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    // Deselect all other versions
    await PostVersion.update(
      { isSelected: false },
      { where: { postId } },
    );

    // Select this version
    await version.update({ isSelected: true });

    // Update post's currentVersionId and generatedText
    await post.update({
      currentVersionId: version.id,
      generatedText: version.generatedText,
    });

    return this.formatVersionResponse(version);
  }

  /**
   * Get a specific version by ID
   */
  async getVersion(versionId: string, userId: string): Promise<VersionResponse | null> {
    const version = await PostVersion.findByPk(versionId, {
      include: [
        {
          model: Post,
          as: 'post',
          where: { userId },
          required: true,
        },
      ],
    });

    if (!version) {
      return null;
    }

    return this.formatVersionResponse(version);
  }

  /**
   * Format a PostVersion model to response format
   */
  private formatVersionResponse(version: PostVersion): VersionResponse {
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      generatedText: version.generatedText,
      iterationPrompt: version.iterationPrompt,
      isSelected: version.isSelected,
      usage: {
        promptTokens: version.promptTokens,
        completionTokens: version.completionTokens,
        totalTokens: version.totalTokens,
      },
      createdAt: version.createdAt,
    };
  }
}

// Export singleton instance
export const postVersionService = new PostVersionService();
export default postVersionService;
