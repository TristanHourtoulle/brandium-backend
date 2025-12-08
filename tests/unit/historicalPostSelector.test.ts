import {
  selectRelevantPosts,
  formatPostsForPrompt,
  buildHistoricalPostsContext,
  estimateHistoricalPostsTokens,
  selectPostsWithTokenBudget,
  MAX_HISTORICAL_POSTS_TOKENS,
} from '../../src/utils/historicalPostSelector';
import { HistoricalPost } from '../../src/models/HistoricalPost';

// Mock HistoricalPost model
const createMockPost = (
  id: string,
  content: string,
  options: Partial<{
    platformId: string;
    publishedAt: Date;
    engagement: { likes?: number; comments?: number; shares?: number; views?: number };
  }> = {},
): HistoricalPost => {
  return {
    id,
    content,
    platformId: options.platformId || null,
    publishedAt: options.publishedAt || null,
    engagement: options.engagement || {},
  } as unknown as HistoricalPost;
};

describe('historicalPostSelector', () => {
  describe('selectRelevantPosts', () => {
    it('should return empty array for empty input', () => {
      const result = selectRelevantPosts([]);
      expect(result).toEqual([]);
    });

    it('should return all posts when count is less than maxPosts', () => {
      const posts = [
        createMockPost('1', 'First post'),
        createMockPost('2', 'Second post'),
        createMockPost('3', 'Third post'),
      ];

      const result = selectRelevantPosts(posts, { maxPosts: 5 });
      expect(result).toHaveLength(3);
    });

    it('should limit to maxPosts', () => {
      const posts = [
        createMockPost('1', 'Post 1'),
        createMockPost('2', 'Post 2'),
        createMockPost('3', 'Post 3'),
        createMockPost('4', 'Post 4'),
        createMockPost('5', 'Post 5'),
        createMockPost('6', 'Post 6'),
      ];

      const result = selectRelevantPosts(posts, { maxPosts: 3 });
      expect(result).toHaveLength(3);
    });

    it('should default to 5 maxPosts', () => {
      const posts = Array.from({ length: 10 }, (_, i) =>
        createMockPost(`${i}`, `Post ${i}`),
      );

      const result = selectRelevantPosts(posts);
      expect(result).toHaveLength(5);
    });

    it('should prioritize posts with higher engagement', () => {
      const posts = [
        createMockPost('low', 'Low engagement', { engagement: { likes: 5 } }),
        createMockPost('high', 'High engagement', { engagement: { likes: 100, comments: 20 } }),
        createMockPost('medium', 'Medium engagement', { engagement: { likes: 30 } }),
      ];

      const result = selectRelevantPosts(posts, { maxPosts: 2 });

      // High engagement post should be first
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.id).toBe('high');
    });

    it('should prioritize more recent posts', () => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const posts = [
        createMockPost('old', 'Old post', { publishedAt: oneMonthAgo }),
        createMockPost('new', 'New post', { publishedAt: now }),
        createMockPost('week', 'Week old post', { publishedAt: oneWeekAgo }),
      ];

      const result = selectRelevantPosts(posts, { maxPosts: 2 });

      // More recent posts should rank higher
      expect(result.map((p) => p.id)).toContain('new');
    });

    it('should prioritize matching platform when platformId is specified', () => {
      const posts = [
        createMockPost('linkedin', 'LinkedIn post', {
          platformId: 'platform-1',
          engagement: { likes: 10 },
        }),
        createMockPost('twitter', 'Twitter post', {
          platformId: 'platform-2',
          engagement: { likes: 100 }, // Higher engagement but different platform
        }),
        createMockPost('linkedin2', 'Another LinkedIn post', {
          platformId: 'platform-1',
          engagement: { likes: 5 },
        }),
      ];

      const result = selectRelevantPosts(posts, {
        maxPosts: 2,
        platformId: 'platform-1',
      });

      // LinkedIn posts should be prioritized
      const linkedinPosts = result.filter((p) => p.platformId === 'platform-1');
      expect(linkedinPosts.length).toBeGreaterThan(0);
    });

    it('should only return matching platform when includeFallback is false', () => {
      const posts = [
        createMockPost('linkedin', 'LinkedIn post', { platformId: 'platform-1' }),
        createMockPost('twitter', 'Twitter post', { platformId: 'platform-2' }),
        createMockPost('linkedin2', 'Another LinkedIn post', { platformId: 'platform-1' }),
      ];

      const result = selectRelevantPosts(posts, {
        maxPosts: 5,
        platformId: 'platform-1',
        includeFallback: false,
      });

      // Should only include LinkedIn posts
      expect(result.every((p) => p.platformId === 'platform-1')).toBe(true);
    });

    it('should include fallback posts when not enough matching platform posts', () => {
      const posts = [
        createMockPost('linkedin', 'LinkedIn post', { platformId: 'platform-1' }),
        createMockPost('twitter', 'Twitter post', {
          platformId: 'platform-2',
          engagement: { likes: 100 },
        }),
      ];

      const result = selectRelevantPosts(posts, {
        maxPosts: 3,
        platformId: 'platform-1',
        includeFallback: true,
      });

      // Should include both posts since we asked for 3 and only have 2 total
      expect(result).toHaveLength(2);
    });

    it('should give bonus to ideal content length posts', () => {
      // LinkedIn optimal length is 1200-1800 characters
      const posts = [
        createMockPost('short', 'Too short'),
        createMockPost(
          'ideal',
          'A'.repeat(1500), // 1500 chars = within LinkedIn optimal range (1200-1800)
        ),
        createMockPost('long', 'A'.repeat(3500)), // Too long
      ];

      const result = selectRelevantPosts(posts, { maxPosts: 1 });

      // Ideal length post should rank highest
      expect(result.length).toBe(1);
      expect(result[0]!.id).toBe('ideal');
    });
  });

  describe('formatPostsForPrompt', () => {
    it('should return empty string for empty array', () => {
      const result = formatPostsForPrompt([]);
      expect(result).toBe('');
    });

    it('should format a single post', () => {
      const posts = [createMockPost('1', 'Test content')];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('### Example 1');
      expect(result).toContain('Test content');
      expect(result).toContain('```');
    });

    it('should include publication date when available', () => {
      const posts = [
        createMockPost('1', 'Test content', {
          publishedAt: new Date('2024-06-15'),
        }),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('Jun 2024');
    });

    it('should include engagement metrics when significant', () => {
      const posts = [
        createMockPost('1', 'Test content', {
          engagement: { likes: 50, comments: 10, shares: 5 },
        }),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('50 likes');
      expect(result).toContain('10 comments');
      expect(result).toContain('5 shares');
    });

    it('should not include engagement when minimal', () => {
      const posts = [
        createMockPost('1', 'Test content', {
          engagement: { likes: 2 },
        }),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).not.toContain('Performance:');
    });

    it('should format multiple posts with separators', () => {
      const posts = [
        createMockPost('1', 'First content'),
        createMockPost('2', 'Second content'),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('### Example 1');
      expect(result).toContain('### Example 2');
      expect(result).toContain('First content');
      expect(result).toContain('Second content');
    });

    it('should show HIGH PERFORMER for posts with >100 engagement', () => {
      const posts = [
        createMockPost('1', 'Test content', {
          engagement: { likes: 100, comments: 20 },
        }),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('HIGH PERFORMER');
    });

    it('should show Good for posts with 50-100 engagement', () => {
      const posts = [
        createMockPost('1', 'Test content', {
          engagement: { likes: 35, comments: 10 }, // 35 + (10 * 2) = 55 total > 50
        }),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('Good');
    });

    it('should show Average for posts with 10-50 engagement', () => {
      const posts = [
        createMockPost('1', 'Test content', {
          engagement: { likes: 15 },
        }),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('Average');
    });

    it('should include views in metrics when available', () => {
      const posts = [
        createMockPost('1', 'Test content', {
          engagement: { views: 1000, likes: 50 },
        }),
      ];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('1000 views');
    });

    it('should detect emojis in content', () => {
      const posts = [createMockPost('1', 'Test content with emoji 🚀')];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('uses emojis');
    });

    it('should detect no emojis in content', () => {
      const posts = [createMockPost('1', 'Test content without emoji')];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('no emojis');
    });

    it('should detect question ending', () => {
      const posts = [createMockPost('1', 'Is this a question?')];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('ends with question');
    });

    it('should detect statement ending', () => {
      const posts = [createMockPost('1', 'This is a statement.')];
      const result = formatPostsForPrompt(posts);

      expect(result).toContain('statement ending');
    });
  });

  describe('buildHistoricalPostsContext', () => {
    it('should return empty string for empty array', () => {
      const result = buildHistoricalPostsContext([]);
      expect(result).toBe('');
    });

    it('should include header with explanation', () => {
      const posts = [createMockPost('1', 'Test content')];
      const result = buildHistoricalPostsContext(posts);

      expect(result).toContain('# WRITING STYLE EXAMPLES');
      expect(result).toContain('REAL past posts');
      expect(result).toContain('MATCH this style');
    });

    it('should include formatted posts', () => {
      const posts = [createMockPost('1', 'My awesome post content')];
      const result = buildHistoricalPostsContext(posts);

      expect(result).toContain('My awesome post content');
    });
  });

  describe('estimateHistoricalPostsTokens', () => {
    it('should return 0 for empty array', () => {
      const result = estimateHistoricalPostsTokens([]);
      expect(result).toBe(0);
    });

    it('should estimate tokens based on content length', () => {
      const posts = [createMockPost('1', 'A'.repeat(400))]; // 400 chars ≈ 100 tokens
      const result = estimateHistoricalPostsTokens(posts);

      // Should be roughly content length / 4 plus header
      expect(result).toBeGreaterThan(100);
    });

    it('should increase with more posts', () => {
      const onePosts = [createMockPost('1', 'Short content')];
      const twoPosts = [
        createMockPost('1', 'Short content'),
        createMockPost('2', 'More content'),
      ];

      const oneResult = estimateHistoricalPostsTokens(onePosts);
      const twoResult = estimateHistoricalPostsTokens(twoPosts);

      expect(twoResult).toBeGreaterThan(oneResult);
    });
  });

  describe('selectPostsWithTokenBudget', () => {
    it('should respect token budget', () => {
      // Create posts with long content
      const posts = Array.from({ length: 10 }, (_, i) =>
        createMockPost(`${i}`, 'A'.repeat(1000)), // Each post is ~250 tokens
      );

      const result = selectPostsWithTokenBudget(posts, { tokenBudget: 500 });

      // Should limit posts to stay within budget
      const tokens = estimateHistoricalPostsTokens(result);
      expect(tokens).toBeLessThanOrEqual(500);
    });

    it('should use MAX_HISTORICAL_POSTS_TOKENS as default budget', () => {
      const posts = Array.from({ length: 10 }, (_, i) =>
        createMockPost(`${i}`, 'A'.repeat(2000)),
      );

      const result = selectPostsWithTokenBudget(posts);

      const tokens = estimateHistoricalPostsTokens(result);
      expect(tokens).toBeLessThanOrEqual(MAX_HISTORICAL_POSTS_TOKENS);
    });

    it('should return empty array if even one post exceeds budget', () => {
      const posts = [createMockPost('1', 'A'.repeat(10000))]; // Very long post

      const result = selectPostsWithTokenBudget(posts, { tokenBudget: 100 });

      expect(result).toEqual([]);
    });

    it('should return all posts if within budget', () => {
      const posts = [
        createMockPost('1', 'Short content'),
        createMockPost('2', 'Another short post'),
      ];

      const result = selectPostsWithTokenBudget(posts, { tokenBudget: 5000 });

      expect(result).toHaveLength(2);
    });
  });

  describe('MAX_HISTORICAL_POSTS_TOKENS', () => {
    it('should be 1500', () => {
      expect(MAX_HISTORICAL_POSTS_TOKENS).toBe(1500);
    });
  });
});
