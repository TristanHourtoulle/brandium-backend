import { HistoricalPost, Profile } from '../models';
import { LLMService, LLMServiceError } from './LLMService';
import {
  buildAnalysisPrompt,
  parseAnalysisResponse,
  validatePostsForAnalysis,
  StyleAnalysisResult,
} from '../utils/analysisPromptBuilder';

/**
 * Analysis result with suggestions for profile
 */
export interface ProfileAnalysisResponse {
  analysis: StyleAnalysisResult;
  totalPostsAnalyzed: number;
  applied: boolean;
  updatedProfile?: Profile;
}

/**
 * Options for profile analysis
 */
export interface AnalysisOptions {
  autoApply?: boolean;
  maxPosts?: number;
  platformId?: string;
}

/**
 * Custom error for profile analysis
 */
export class ProfileAnalysisError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'ANALYSIS_ERROR') {
    super(message);
    this.name = 'ProfileAnalysisError';
    this.code = code;
  }
}

/**
 * Service for analyzing historical posts and generating profile suggestions
 */
export class ProfileAnalysisService {
  private llmService: LLMService;

  constructor(llmService?: LLMService) {
    this.llmService = llmService || new LLMService();
  }

  /**
   * Analyze historical posts for a profile and generate style suggestions
   */
  async analyzePostsForProfile(
    profile: Profile,
    options: AnalysisOptions = {},
  ): Promise<ProfileAnalysisResponse> {
    const { autoApply = false, maxPosts = 25, platformId } = options;

    // Build query conditions
    const whereClause: Record<string, unknown> = {
      profileId: profile.id,
      userId: profile.userId,
    };

    if (platformId) {
      whereClause.platformId = platformId;
    }

    // Fetch historical posts
    const posts = await HistoricalPost.findAll({
      where: whereClause,
      order: [
        ['publishedAt', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: maxPosts,
    });

    // Validate posts
    const validation = validatePostsForAnalysis(posts);
    if (!validation.valid) {
      throw new ProfileAnalysisError(validation.error || 'Validation failed', 'INSUFFICIENT_POSTS');
    }

    // Build and execute analysis prompt
    const prompt = buildAnalysisPrompt(posts);

    let analysisResult: StyleAnalysisResult;

    try {
      const response = await this.llmService.generate({
        prompt,
        maxTokens: 1500,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      // Parse the response
      const parsed = parseAnalysisResponse(response.text, posts.length);

      if (!parsed) {
        throw new ProfileAnalysisError(
          'Failed to parse AI analysis response',
          'PARSE_ERROR',
        );
      }

      analysisResult = parsed;
    } catch (error) {
      if (error instanceof ProfileAnalysisError) {
        throw error;
      }
      if (error instanceof LLMServiceError) {
        throw new ProfileAnalysisError(
          `AI analysis failed: ${error.message}`,
          error.code,
        );
      }
      throw new ProfileAnalysisError(
        'Failed to analyze posts',
        'ANALYSIS_FAILED',
      );
    }

    // Auto-apply if requested
    let updatedProfile: Profile | undefined;

    if (autoApply) {
      updatedProfile = await this.applyAnalysisToProfile(profile, analysisResult);
    }

    return {
      analysis: analysisResult,
      totalPostsAnalyzed: posts.length,
      applied: autoApply,
      updatedProfile,
    };
  }

  /**
   * Apply analysis results to a profile
   */
  async applyAnalysisToProfile(
    profile: Profile,
    analysis: StyleAnalysisResult,
  ): Promise<Profile> {
    // Merge new suggestions with existing profile data
    const mergedToneTags = this.mergeArrays(profile.toneTags || [], analysis.toneTags);
    const mergedDoRules = this.mergeArrays(profile.doRules || [], analysis.doRules);
    const mergedDontRules = this.mergeArrays(profile.dontRules || [], analysis.dontRules);

    await profile.update({
      toneTags: mergedToneTags,
      doRules: mergedDoRules,
      dontRules: mergedDontRules,
    });

    return profile;
  }

  /**
   * Merge two arrays, removing duplicates (case-insensitive)
   */
  private mergeArrays(existing: string[], newItems: string[]): string[] {
    const normalizedExisting = new Set(existing.map((s) => s.toLowerCase().trim()));
    const merged = [...existing];

    for (const item of newItems) {
      const normalized = item.toLowerCase().trim();
      if (!normalizedExisting.has(normalized)) {
        merged.push(item);
        normalizedExisting.add(normalized);
      }
    }

    return merged;
  }

  /**
   * Get analysis statistics for a profile
   */
  async getAnalysisStats(profileId: string, userId: string): Promise<{
    totalPosts: number;
    postsWithEngagement: number;
    hasEnoughPosts: boolean;
    minimumRequired: number;
    platforms: Array<{ platformId: string | null; count: number }>;
  }> {
    const posts = await HistoricalPost.findAll({
      where: { profileId, userId },
      attributes: ['platformId', 'engagement'],
    });

    const platformCounts: Record<string, number> = {};
    let postsWithEngagement = 0;

    for (const post of posts) {
      const platformKey = post.platformId || 'no_platform';
      platformCounts[platformKey] = (platformCounts[platformKey] || 0) + 1;

      const engagement = post.engagement || {};
      if (Object.keys(engagement).length > 0) {
        postsWithEngagement++;
      }
    }

    return {
      totalPosts: posts.length,
      postsWithEngagement,
      hasEnoughPosts: posts.length >= 5,
      minimumRequired: 5,
      platforms: Object.entries(platformCounts).map(([id, count]) => ({
        platformId: id === 'no_platform' ? null : id,
        count,
      })),
    };
  }
}

// Export the class - instances should be created where needed
export default ProfileAnalysisService;
