import { HistoricalPost } from '../models/HistoricalPost';
import { LINKEDIN_GUIDELINES } from '../config/constants';

/**
 * Options for selecting historical posts
 */
export interface PostSelectionOptions {
  /**
   * Maximum number of posts to return
   * @default 5
   */
  maxPosts?: number;

  /**
   * Filter by platform ID (prioritizes matching platform)
   */
  platformId?: string | null;

  /**
   * Include posts from other platforms if not enough matching platform posts
   * @default true
   */
  includeFallback?: boolean;

  /**
   * Weight for engagement scoring
   * @default 1.0
   */
  engagementWeight?: number;

  /**
   * Weight for recency scoring
   * @default 1.0
   */
  recencyWeight?: number;
}

/**
 * Scored post with calculated relevance
 */
interface ScoredPost {
  post: HistoricalPost;
  score: number;
  matchesPlatform: boolean;
}

/**
 * Calculate total engagement from a post
 */
function calculateTotalEngagement(post: HistoricalPost): number {
  const engagement = post.engagement || {};
  return (
    (engagement.likes || 0) +
    (engagement.comments || 0) * 2 + // Comments are weighted higher
    (engagement.shares || 0) * 3 + // Shares are weighted highest
    (engagement.views || 0) * 0.01 // Views have low weight
  );
}

/**
 * Calculate recency score (exponential decay)
 * Posts lose 50% of their recency score every 30 days
 */
function calculateRecencyScore(publishedAt: Date | null): number {
  if (!publishedAt) {
    return 50; // Default score for posts without date
  }

  const now = new Date();
  const ageInDays = (now.getTime() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: score = 100 * (0.5)^(age/30)
  // This means a 30-day old post has 50% score, 60-day old has 25%, etc.
  return Math.max(0, 100 * Math.pow(0.5, ageInDays / 30));
}

/**
 * Calculate overall score for a post (optimized for LinkedIn)
 */
function calculatePostScore(
  post: HistoricalPost,
  targetPlatformId: string | null | undefined,
  options: PostSelectionOptions,
): ScoredPost {
  const engagementWeight = options.engagementWeight ?? 1.0;
  const recencyWeight = options.recencyWeight ?? 1.0;

  // Base score
  let score = 100;

  // Engagement bonus (logarithmic to prevent very high engagement posts from dominating)
  const totalEngagement = calculateTotalEngagement(post);
  const engagementBonus = Math.log(totalEngagement + 1) * 10 * engagementWeight;
  score += engagementBonus;

  // Recency bonus
  const recencyBonus = calculateRecencyScore(post.publishedAt) * recencyWeight;
  score += recencyBonus;

  // Platform matching bonus
  const matchesPlatform = targetPlatformId ? post.platformId === targetPlatformId : false;
  if (matchesPlatform) {
    score += 50; // Significant bonus for matching platform
  }

  // Content quality bonus (optimized for LinkedIn ideal length: 1200-1800 chars)
  const contentLength = post.content?.length || 0;
  if (
    contentLength >= LINKEDIN_GUIDELINES.OPTIMAL_MIN_LENGTH &&
    contentLength <= LINKEDIN_GUIDELINES.OPTIMAL_MAX_LENGTH
  ) {
    score += 30; // Ideal LinkedIn length bonus
  } else if (contentLength >= 800 && contentLength <= 2000) {
    score += 15; // Good length
  } else if (contentLength < 300) {
    score -= 30; // Too short for LinkedIn
  }

  // High performer bonus
  if (totalEngagement > 50) {
    score += 25;
  }

  // Future: Favorite posts bonus (prepared for metadata.isFavorite)
  // if (post.metadata?.isFavorite) {
  //   score += 200; // Massive bonus for favorites
  // }

  return { post, score, matchesPlatform };
}

/**
 * Select the most relevant historical posts for generation context
 *
 * Uses a scoring algorithm that considers:
 * - Platform matching (priority to same platform)
 * - Engagement metrics (likes, comments, shares)
 * - Recency (more recent posts score higher)
 * - Content quality (based on length)
 */
export function selectRelevantPosts(
  posts: HistoricalPost[],
  options: PostSelectionOptions = {},
): HistoricalPost[] {
  const maxPosts = options.maxPosts ?? 5;
  const includeFallback = options.includeFallback ?? true;
  const targetPlatformId = options.platformId;

  if (posts.length === 0) {
    return [];
  }

  // Score all posts
  const scoredPosts: ScoredPost[] = posts.map((post) =>
    calculatePostScore(post, targetPlatformId, options),
  );

  // Sort by score descending
  scoredPosts.sort((a, b) => b.score - a.score);

  // If we have a target platform, prioritize matching posts
  if (targetPlatformId && !includeFallback) {
    // Only return posts matching the platform
    const matchingPosts = scoredPosts
      .filter((sp) => sp.matchesPlatform)
      .slice(0, maxPosts)
      .map((sp) => sp.post);
    return matchingPosts;
  }

  // Otherwise, return top scored posts (mix of matching and non-matching)
  return scoredPosts.slice(0, maxPosts).map((sp) => sp.post);
}

/**
 * Check if content contains emojis
 */
function hasEmojis(content: string): boolean {
  // Match common emoji ranges
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  return emojiRegex.test(content);
}

/**
 * Format historical posts for inclusion in the generation prompt
 * Includes style analysis hints for better AI understanding
 */
export function formatPostsForPrompt(posts: HistoricalPost[]): string {
  if (posts.length === 0) {
    return '';
  }

  const formattedPosts = posts
    .map((post, index) => {
      let formatted = `### Example ${index + 1}`;

      // Add date if available
      if (post.publishedAt) {
        const date = new Date(post.publishedAt).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        });
        formatted += ` (${date})`;
      }

      formatted += '\n';

      // Add engagement with performance indicator
      const engagement = post.engagement || {};
      const totalEngagement = calculateTotalEngagement(post);
      if (totalEngagement > 10) {
        const metrics: string[] = [];
        if (engagement.views) metrics.push(`${engagement.views} views`);
        if (engagement.likes) metrics.push(`${engagement.likes} likes`);
        if (engagement.comments) metrics.push(`${engagement.comments} comments`);
        if (engagement.shares) metrics.push(`${engagement.shares} shares`);
        if (metrics.length > 0) {
          // Add performance indicator
          let performanceLevel = 'Average';
          if (totalEngagement > 100) performanceLevel = 'HIGH PERFORMER';
          else if (totalEngagement > 50) performanceLevel = 'Good';

          formatted += `_${performanceLevel}: ${metrics.join(', ')}_\n`;
        }
      }

      // Add style analysis hints
      const contentLength = post.content?.length || 0;
      const contentHasEmojis = hasEmojis(post.content);
      const endsWithQuestion = post.content.trim().endsWith('?');

      formatted += `_Style: ${contentLength} chars, ${contentHasEmojis ? 'uses emojis' : 'no emojis'}, ${endsWithQuestion ? 'ends with question' : 'statement ending'}_\n`;

      // Add content
      formatted += '\n```\n';
      formatted += post.content.trim();
      formatted += '\n```';

      return formatted;
    })
    .join('\n\n');

  return formattedPosts;
}

/**
 * Build the historical posts section for the prompt
 * With detailed instructions on how to mimic the author's style
 */
export function buildHistoricalPostsContext(posts: HistoricalPost[]): string {
  if (posts.length === 0) {
    return '';
  }

  let context = '# WRITING STYLE EXAMPLES (CRITICAL - MIMIC THIS STYLE)\n\n';

  context += "These are the author's REAL past posts. Your job is to MATCH this style exactly:\n\n";

  context += '**ANALYZE AND COPY:**\n';
  context += '- How do they start their posts? (Hook style)\n';
  context += '- Sentence length: short? medium? mixed?\n';
  context += '- Do they use emojis? Where and how many?\n';
  context += '- How do they end? (Question? Statement? CTA?)\n';
  context += '- Vocabulary level: Simple or technical?\n';
  context += '- Personal stories or more abstract?\n\n';

  context += formatPostsForPrompt(posts);
  context += '\n\n';

  context += '**IMPORTANT:** If the examples above use emojis, use them similarly. ';
  context += "If they don't, DON'T add any. Match their exact style.";

  return context;
}

/**
 * Estimate the token count for historical posts context
 * (Useful for staying within token limits)
 */
export function estimateHistoricalPostsTokens(posts: HistoricalPost[]): number {
  const context = buildHistoricalPostsContext(posts);
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(context.length / 4);
}

/**
 * Default maximum tokens to allocate for historical posts
 * This leaves room for other context (profile, project, platform, task)
 */
export const MAX_HISTORICAL_POSTS_TOKENS = 1500;

/**
 * Select posts while respecting token budget
 */
export function selectPostsWithTokenBudget(
  posts: HistoricalPost[],
  options: PostSelectionOptions & { tokenBudget?: number } = {},
): HistoricalPost[] {
  const tokenBudget = options.tokenBudget ?? MAX_HISTORICAL_POSTS_TOKENS;
  const maxPosts = options.maxPosts ?? 10;

  // Start with the best posts
  const selectedPosts = selectRelevantPosts(posts, { ...options, maxPosts });

  // Reduce until within token budget
  while (selectedPosts.length > 0) {
    const tokens = estimateHistoricalPostsTokens(selectedPosts);
    if (tokens <= tokenBudget) {
      break;
    }
    selectedPosts.pop(); // Remove lowest-scoring post
  }

  return selectedPosts;
}

export default {
  selectRelevantPosts,
  formatPostsForPrompt,
  buildHistoricalPostsContext,
  estimateHistoricalPostsTokens,
  selectPostsWithTokenBudget,
  MAX_HISTORICAL_POSTS_TOKENS,
};
