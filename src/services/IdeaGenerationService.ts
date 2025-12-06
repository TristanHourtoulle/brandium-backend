import { Profile, Project, Platform, HistoricalPost, PostIdea } from '../models';
import { GenerationContext } from '../models/PostIdea';
import { findUserResource } from '../utils/controllerHelpers';
import { llmService } from './LLMService';

/**
 * Parameters for generating post ideas
 */
export interface IdeaGenerationParams {
  userId: string;
  profileId?: string;
  projectId?: string;
  platformId?: string;
  auto?: boolean;
  customContext?: string;
  count?: number;
  excludeRecentTopics?: boolean;
}

/**
 * A single generated idea from the LLM
 */
export interface GeneratedIdea {
  title: string;
  description: string;
  suggestedGoal?: string;
  relevanceScore: number;
  tags: string[];
}

/**
 * Result of idea generation
 */
export interface IdeaGenerationResult {
  ideas: PostIdea[];
  context: {
    profile?: { id: string; name: string } | null;
    project?: { id: string; name: string } | null;
    platform?: { id: string; name: string } | null;
    historicalPostsAnalyzed: number;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Resolved context for idea generation
 */
export interface ResolvedContext {
  profile: Profile | null;
  project: Project | null;
  platform: Platform | null;
  historicalPosts: HistoricalPost[];
  mode: 'auto' | 'manual' | 'custom';
}

/**
 * Parameters for saving ideas to database
 */
interface SaveIdeasParams {
  userId: string;
  profileId?: string | null;
  projectId?: string | null;
  platformId?: string | null;
  generationContext: GenerationContext;
}

/**
 * Custom error for insufficient context
 */
export class InsufficientContextError extends Error {
  constructor(message?: string) {
    super(
      message ||
        'Insufficient context for idea generation. Please provide at least one of: profileId, projectId, platformId, or enable auto mode.',
    );
    this.name = 'InsufficientContextError';
  }
}

/**
 * Custom error when user has no resources
 */
export class NoResourcesError extends Error {
  constructor() {
    super(
      'No profiles, projects, or platforms found. Please create at least one before generating ideas.',
    );
    this.name = 'NoResourcesError';
  }
}

/**
 * Platform-specific keywords for relevance scoring
 */
const PLATFORM_KEYWORDS: Record<string, string[]> = {
  linkedin: [
    'professional',
    'career',
    'business',
    'industry',
    'leadership',
    'networking',
    'insight',
    'expertise',
  ],
  twitter: ['thread', 'hot take', 'trending', 'viral', 'opinion', 'debate', 'quick tip'],
  x: ['thread', 'hot take', 'trending', 'viral', 'opinion', 'debate', 'quick tip'],
  tiktok: ['trend', 'challenge', 'duet', 'viral', 'hook', 'story time', 'pov'],
  instagram: ['aesthetic', 'story', 'reel', 'visual', 'lifestyle', 'behind the scenes'],
  facebook: ['community', 'share', 'discussion', 'group', 'event', 'memory'],
};

/**
 * Common content type keywords for tag extraction
 */
const CONTENT_TYPE_TAGS: Record<string, string[]> = {
  tips: ['tip', 'advice', 'how to', 'guide', 'tutorial', 'steps'],
  story: ['story', 'experience', 'journey', 'lesson', 'learned'],
  opinion: ['think', 'believe', 'opinion', 'perspective', 'view'],
  question: ['question', 'ask', 'wondering', 'curious', 'what if'],
  insight: ['insight', 'discovery', 'realized', 'noticed', 'observation'],
  motivation: ['inspire', 'motivate', 'encourage', 'empower', 'mindset'],
  industry: ['industry', 'trend', 'market', 'sector', 'business'],
};

/**
 * Custom error for JSON parsing failures
 */
export class IdeaParsingError extends Error {
  public readonly rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = 'IdeaParsingError';
    this.rawResponse = rawResponse;
  }
}

/**
 * Service for generating post ideas using AI
 */
class IdeaGenerationService {
  private readonly DEFAULT_COUNT = 10;
  private readonly MAX_COUNT = 20;
  private readonly MIN_COUNT = 1;

  /**
   * Main method to generate post ideas
   */
  async generateIdeas(params: IdeaGenerationParams): Promise<IdeaGenerationResult> {
    const count = this.validateCount(params.count);

    // Resolve context based on parameters
    const resolvedContext = await this.resolveContext(params);

    // Extract recent topics to avoid if enabled
    const recentTopics = params.excludeRecentTopics !== false
      ? this.extractRecentTopics(resolvedContext.historicalPosts)
      : [];

    // Build the prompt for idea generation
    const prompt = this.buildIdeaPrompt({
      ...resolvedContext,
      count,
      recentTopics,
      customContext: params.customContext,
    });

    // Generate ideas using LLM with retry logic for parsing errors
    let generatedIdeas: GeneratedIdea[] = [];
    let lastError: Error | null = null;
    let tokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const llmResponse = await llmService.generate({
          prompt,
          maxTokens: 2000,
          temperature: attempt === 0 ? 0.8 : 0.7, // Lower temperature on retry
        });

        tokenUsage = llmResponse.usage;
        generatedIdeas = this.parseOpenAIResponse(llmResponse.text, count);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;

        // Only retry on parsing errors, not on LLM service errors
        if (!(error instanceof IdeaParsingError)) {
          throw error;
        }

        // If this was the last attempt, throw the error
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait a bit before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }

    // Safety check - should not happen if loop logic is correct
    if (generatedIdeas.length === 0 && lastError) {
      throw lastError;
    }

    // Enhance ideas with better scoring and tags
    generatedIdeas = this.enhanceIdeas(generatedIdeas, resolvedContext);

    // Remove duplicates
    generatedIdeas = this.deduplicateIdeas(generatedIdeas);

    // Sort by relevance score (highest first)
    generatedIdeas.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Build generation context metadata
    const generationContext: GenerationContext = {
      mode: resolvedContext.mode,
      customContext: params.customContext,
      historicalPostsCount: resolvedContext.historicalPosts.length,
      recentTopicsExcluded: recentTopics,
      timestamp: new Date().toISOString(),
    };

    // Save ideas to database
    const savedIdeas = await this.saveIdeas(generatedIdeas, {
      userId: params.userId,
      profileId: resolvedContext.profile?.id || null,
      projectId: resolvedContext.project?.id || null,
      platformId: resolvedContext.platform?.id || null,
      generationContext,
    });

    return {
      ideas: savedIdeas,
      context: {
        profile: resolvedContext.profile
          ? { id: resolvedContext.profile.id, name: resolvedContext.profile.name }
          : null,
        project: resolvedContext.project
          ? { id: resolvedContext.project.id, name: resolvedContext.project.name }
          : null,
        platform: resolvedContext.platform
          ? { id: resolvedContext.platform.id, name: resolvedContext.platform.name }
          : null,
        historicalPostsAnalyzed: resolvedContext.historicalPosts.length,
      },
      usage: tokenUsage,
    };
  }

  /**
   * Validate and normalize the count parameter
   */
  private validateCount(count?: number): number {
    if (!count) return this.DEFAULT_COUNT;
    return Math.max(this.MIN_COUNT, Math.min(this.MAX_COUNT, count));
  }

  /**
   * Resolve context based on parameters (auto mode or manual)
   */
  async resolveContext(params: IdeaGenerationParams): Promise<ResolvedContext> {
    const { userId, profileId, projectId, platformId, auto } = params;

    let profile: Profile | null = null;
    let project: Project | null = null;
    let platform: Platform | null = null;
    let mode: 'auto' | 'manual' | 'custom' = params.customContext ? 'custom' : 'manual';

    if (auto) {
      mode = 'auto';
      // Fetch user's most recently updated resources
      [profile, project, platform] = await Promise.all([
        Profile.findOne({
          where: { userId },
          order: [['updatedAt', 'DESC']],
        }),
        Project.findOne({
          where: { userId },
          order: [['updatedAt', 'DESC']],
        }),
        Platform.findOne({
          where: { userId },
          order: [['updatedAt', 'DESC']],
        }),
      ]);

      // Check if user has any resources in auto mode
      if (!profile && !project && !platform) {
        throw new NoResourcesError();
      }
    } else {
      // Manual mode: fetch specified resources
      const resourcePromises = await Promise.all([
        profileId ? findUserResource(Profile, profileId, userId) : null,
        projectId ? findUserResource(Project, projectId, userId) : null,
        platformId ? findUserResource(Platform, platformId, userId) : null,
      ]);

      profile = resourcePromises[0] as Profile | null;
      project = resourcePromises[1] as Project | null;
      platform = resourcePromises[2] as Platform | null;

      // Validate that at least one context is provided (unless custom context)
      if (!profile && !project && !platform && !params.customContext) {
        throw new InsufficientContextError();
      }
    }

    // Fetch historical posts if profile exists
    let historicalPosts: HistoricalPost[] = [];
    if (profile) {
      historicalPosts = await HistoricalPost.findAll({
        where: { profileId: profile.id, userId },
        order: [['publishedAt', 'DESC']],
        limit: 20,
      });
    }

    return { profile, project, platform, historicalPosts, mode };
  }

  /**
   * Extract recent topics from historical posts to avoid repetition
   */
  extractRecentTopics(historicalPosts: HistoricalPost[]): string[] {
    if (!historicalPosts.length) return [];

    // Take the 10 most recent posts
    const recentPosts = historicalPosts.slice(0, 10);

    // Extract key topics/themes from each post (simplified extraction)
    const topics: string[] = [];

    for (const post of recentPosts) {
      // Extract first sentence or first 100 chars as topic indicator
      const content = post.content.trim();
      const firstSentence = content.split(/[.!?]/)[0]?.trim();
      if (firstSentence && firstSentence.length > 10) {
        topics.push(firstSentence.slice(0, 100));
      }
    }

    return topics.slice(0, 5); // Limit to 5 recent topics
  }

  /**
   * Build the prompt for idea generation
   */
  private buildIdeaPrompt(context: ResolvedContext & {
    count: number;
    recentTopics: string[];
    customContext?: string;
  }): string {
    const sections: string[] = [];

    // System instruction with output format
    sections.push(`# TASK: Generate ${context.count} unique post ideas

You are an expert content strategist for personal branding. Generate creative, engaging post ideas that align with the provided context. Each idea should be distinct and actionable.

## OUTPUT FORMAT
Return ONLY a valid JSON array with exactly ${context.count} ideas. No additional text before or after the JSON.

Each idea object must have:
- "title": Short catchy title (max 100 characters)
- "description": Detailed description of the post idea (2-3 sentences explaining the content)
- "suggestedGoal": What this post aims to achieve (e.g., "Increase engagement", "Establish thought leadership")
- "relevanceScore": Number between 0.5 and 1.0 indicating how well it fits the context
- "tags": Array of 2-4 relevant tags

Example format:
[
  {
    "title": "The Power of Daily Micro-Learning",
    "description": "Share how spending just 15 minutes daily on learning compounds over time. Include personal anecdotes about skills acquired through consistent small efforts.",
    "suggestedGoal": "Position as lifelong learner and inspire audience",
    "relevanceScore": 0.85,
    "tags": ["learning", "productivity", "personal-growth"]
  }
]`);

    // Add profile context
    if (context.profile) {
      let profileSection = '## AUTHOR PROFILE\n';
      profileSection += `Name: ${context.profile.name}\n`;
      if (context.profile.bio) {
        profileSection += `Bio: ${context.profile.bio}\n`;
      }
      if (context.profile.toneTags?.length) {
        profileSection += `Tone & Style: ${context.profile.toneTags.join(', ')}\n`;
      }
      if (context.profile.doRules?.length) {
        profileSection += `DO: ${context.profile.doRules.join('; ')}\n`;
      }
      if (context.profile.dontRules?.length) {
        profileSection += `DON'T: ${context.profile.dontRules.join('; ')}\n`;
      }
      sections.push(profileSection);
    }

    // Add project context
    if (context.project) {
      let projectSection = '## PROJECT CONTEXT\n';
      projectSection += `Project: ${context.project.name}\n`;
      if (context.project.description) {
        projectSection += `Description: ${context.project.description}\n`;
      }
      if (context.project.audience) {
        projectSection += `Target Audience: ${context.project.audience}\n`;
      }
      if (context.project.keyMessages?.length) {
        projectSection += `Key Messages: ${context.project.keyMessages.join('; ')}\n`;
      }
      sections.push(projectSection);
    }

    // Add platform context
    if (context.platform) {
      let platformSection = '## PLATFORM\n';
      platformSection += `Platform: ${context.platform.name}\n`;
      if (context.platform.styleGuidelines) {
        platformSection += `Style Guidelines: ${context.platform.styleGuidelines}\n`;
      }
      if (context.platform.maxLength) {
        platformSection += `Max Length: ${context.platform.maxLength} characters\n`;
      }
      sections.push(platformSection);
    }

    // Add topics to avoid
    if (context.recentTopics.length) {
      let avoidSection = '## TOPICS TO AVOID (recently covered)\n';
      avoidSection += 'Generate ideas that are DIFFERENT from these recent topics:\n';
      context.recentTopics.forEach((topic, i) => {
        avoidSection += `${i + 1}. "${topic}"\n`;
      });
      sections.push(avoidSection);
    }

    // Add custom context
    if (context.customContext) {
      sections.push(`## ADDITIONAL CONTEXT\n${context.customContext}`);
    }

    // Final instruction
    sections.push(`## IMPORTANT
- Generate exactly ${context.count} unique ideas
- Each idea must be actionable and specific
- Vary the types of content (stories, tips, questions, insights, etc.)
- Consider the platform's style if provided
- Return ONLY the JSON array, no other text`);

    return sections.join('\n\n---\n\n');
  }

  /**
   * Parse the OpenAI response and extract ideas
   */
  parseOpenAIResponse(response: string, expectedCount: number): GeneratedIdea[] {
    // Try to extract JSON from the response
    let jsonString = response.trim();

    // Handle cases where LLM adds text before/after JSON
    const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new IdeaParsingError(
        'Failed to parse LLM response as JSON. The response may be malformed.',
        response,
      );
    }

    if (!Array.isArray(parsed)) {
      throw new IdeaParsingError('LLM response is not an array.', response);
    }

    // Validate and normalize each idea
    const ideas: GeneratedIdea[] = [];
    for (const item of parsed) {
      if (!this.isValidIdeaObject(item)) {
        continue; // Skip invalid ideas
      }

      ideas.push({
        title: String(item.title).slice(0, 255),
        description: String(item.description),
        suggestedGoal: item.suggestedGoal ? String(item.suggestedGoal) : undefined,
        relevanceScore: this.normalizeScore(item.relevanceScore),
        tags: this.normalizeTags(item.tags),
      });
    }

    if (ideas.length === 0) {
      throw new IdeaParsingError('No valid ideas found in LLM response.', response);
    }

    // If we got fewer ideas than expected, that's okay
    // If we got more, truncate
    return ideas.slice(0, expectedCount);
  }

  /**
   * Check if an object is a valid idea
   */
  private isValidIdeaObject(obj: unknown): obj is {
    title: string;
    description: string;
    suggestedGoal?: string;
    relevanceScore?: number;
    tags?: string[];
  } {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    return (
      typeof o.title === 'string' &&
      o.title.length > 0 &&
      typeof o.description === 'string' &&
      o.description.length > 0
    );
  }

  /**
   * Normalize relevance score to be between 0 and 1
   */
  private normalizeScore(score: unknown): number {
    if (typeof score !== 'number' || isNaN(score)) return 0.5;
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Normalize tags array
   */
  private normalizeTags(tags: unknown): string[] {
    if (!Array.isArray(tags)) return [];
    return tags
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 0)
      .slice(0, 10);
  }

  /**
   * Calculate relevance score based on context matching
   */
  private calculateRelevanceScore(
    idea: GeneratedIdea,
    context: ResolvedContext,
  ): number {
    let score = 0.5; // Base score
    const textLower = `${idea.title} ${idea.description}`.toLowerCase();

    // Boost for profile tone matching
    if (context.profile?.toneTags?.length) {
      const matchingTones = context.profile.toneTags.filter((tone) =>
        textLower.includes(tone.toLowerCase()),
      );
      score += Math.min(0.15, matchingTones.length * 0.05);
    }

    // Boost for project audience alignment
    if (context.project?.audience) {
      const audienceWords = context.project.audience.toLowerCase().split(/\s+/);
      const matches = audienceWords.filter(
        (word) => word.length > 3 && textLower.includes(word),
      );
      score += Math.min(0.1, matches.length * 0.03);
    }

    // Boost for project key messages alignment
    if (context.project?.keyMessages?.length) {
      const messageMatches = context.project.keyMessages.filter((msg) => {
        const keywords = msg.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
        return keywords.some((kw) => textLower.includes(kw));
      });
      score += Math.min(0.1, messageMatches.length * 0.05);
    }

    // Boost for platform style matching
    if (context.platform?.name) {
      const platformName = context.platform.name.toLowerCase();
      const keywords = PLATFORM_KEYWORDS[platformName] || [];
      const platformMatches = keywords.filter((kw) => textLower.includes(kw));
      score += Math.min(0.15, platformMatches.length * 0.05);
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Extract additional tags from idea content
   */
  private extractAdditionalTags(idea: GeneratedIdea): string[] {
    const textLower = `${idea.title} ${idea.description}`.toLowerCase();
    const additionalTags: string[] = [];

    // Check for content type tags
    for (const [tagName, keywords] of Object.entries(CONTENT_TYPE_TAGS)) {
      if (keywords.some((kw) => textLower.includes(kw))) {
        additionalTags.push(tagName);
      }
    }

    return additionalTags;
  }

  /**
   * Enhance ideas with better scoring and tags
   */
  private enhanceIdeas(ideas: GeneratedIdea[], context: ResolvedContext): GeneratedIdea[] {
    return ideas.map((idea) => {
      // Recalculate relevance score based on context
      const enhancedScore = this.calculateRelevanceScore(idea, context);

      // Extract additional tags
      const additionalTags = this.extractAdditionalTags(idea);

      // Merge tags without duplicates
      const allTags = [...new Set([...idea.tags, ...additionalTags])].slice(0, 6);

      return {
        ...idea,
        relevanceScore: Math.max(idea.relevanceScore, enhancedScore),
        tags: allTags,
      };
    });
  }

  /**
   * Remove duplicate or very similar ideas
   */
  private deduplicateIdeas(ideas: GeneratedIdea[]): GeneratedIdea[] {
    const seen = new Set<string>();
    const deduplicated: GeneratedIdea[] = [];

    for (const idea of ideas) {
      // Create a simple fingerprint from title words
      const titleWords = idea.title
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .sort()
        .join(' ');

      // Check if we've seen a similar title
      if (!seen.has(titleWords)) {
        seen.add(titleWords);
        deduplicated.push(idea);
      }
    }

    return deduplicated;
  }

  /**
   * Save generated ideas to database
   */
  async saveIdeas(ideas: GeneratedIdea[], params: SaveIdeasParams): Promise<PostIdea[]> {
    const savedIdeas: PostIdea[] = [];

    for (const idea of ideas) {
      const postIdea = await PostIdea.create({
        userId: params.userId,
        profileId: params.profileId,
        projectId: params.projectId,
        platformId: params.platformId,
        title: idea.title,
        description: idea.description,
        suggestedGoal: idea.suggestedGoal || null,
        relevanceScore: idea.relevanceScore,
        tags: idea.tags,
        generationContext: params.generationContext,
        isUsed: false,
      });
      savedIdeas.push(postIdea);
    }

    return savedIdeas;
  }

  /**
   * Mark an idea as used
   */
  async markAsUsed(ideaId: string, userId: string, postId?: string): Promise<PostIdea | null> {
    const idea = await PostIdea.findOne({
      where: { id: ideaId, userId },
    });

    if (!idea) return null;

    await idea.update({
      isUsed: true,
      usedAt: new Date(),
      postId: postId || null,
    });

    return idea;
  }

  /**
   * Get ideas for a user with filters
   */
  async getIdeas(
    userId: string,
    filters: {
      profileId?: string;
      projectId?: string;
      platformId?: string;
      isUsed?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ ideas: PostIdea[]; total: number }> {
    const where: Record<string, unknown> = { userId };

    if (filters.profileId) where.profileId = filters.profileId;
    if (filters.projectId) where.projectId = filters.projectId;
    if (filters.platformId) where.platformId = filters.platformId;
    if (filters.isUsed !== undefined) where.isUsed = filters.isUsed;

    const { rows: ideas, count: total } = await PostIdea.findAndCountAll({
      where,
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Profile, as: 'profile', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Platform, as: 'platform', attributes: ['id', 'name'] },
      ],
    });

    return { ideas, total };
  }

  /**
   * Get a single idea by ID
   */
  async getIdeaById(ideaId: string, userId: string): Promise<PostIdea | null> {
    return PostIdea.findOne({
      where: { id: ideaId, userId },
      include: [
        { model: Profile, as: 'profile', attributes: ['id', 'name'] },
        { model: Project, as: 'project', attributes: ['id', 'name'] },
        { model: Platform, as: 'platform', attributes: ['id', 'name'] },
      ],
    });
  }

  /**
   * Delete an idea
   */
  async deleteIdea(ideaId: string, userId: string): Promise<boolean> {
    const deleted = await PostIdea.destroy({
      where: { id: ideaId, userId },
    });
    return deleted > 0;
  }
}

// Export singleton instance
export const ideaGenerationService = new IdeaGenerationService();
export default ideaGenerationService;
