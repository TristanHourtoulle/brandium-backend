import { HistoricalPost } from '../models/HistoricalPost';

/**
 * Style analysis result from AI
 */
export interface StyleAnalysisResult {
  toneTags: string[];
  doRules: string[];
  dontRules: string[];
  styleInsights: {
    averageLength: 'short' | 'medium' | 'long';
    emojiUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
    hashtagUsage: 'none' | 'minimal' | 'moderate' | 'heavy';
    questionUsage: 'none' | 'low' | 'moderate' | 'high';
    callToActionUsage: 'none' | 'low' | 'moderate' | 'high';
  };
  confidence: number;
}

/**
 * Format historical posts for analysis prompt
 */
function formatPostsForAnalysis(posts: HistoricalPost[]): string {
  return posts
    .map((post, index) => {
      let formattedPost = `### Post ${index + 1}`;

      if (post.publishedAt) {
        formattedPost += ` (${new Date(post.publishedAt).toISOString().split('T')[0]})`;
      }

      formattedPost += '\n```\n';
      formattedPost += post.content.trim();
      formattedPost += '\n```';

      // Add engagement data if available
      const engagement = post.engagement || {};
      const hasEngagement =
        engagement.likes || engagement.comments || engagement.shares || engagement.views;

      if (hasEngagement) {
        formattedPost += '\n**Engagement:** ';
        const metrics = [];
        if (engagement.likes) metrics.push(`${engagement.likes} likes`);
        if (engagement.comments) metrics.push(`${engagement.comments} comments`);
        if (engagement.shares) metrics.push(`${engagement.shares} shares`);
        if (engagement.views) metrics.push(`${engagement.views} views`);
        formattedPost += metrics.join(', ');
      }

      return formattedPost;
    })
    .join('\n\n');
}

/**
 * Calculate confidence score based on post count
 */
export function calculateConfidence(postCount: number): number {
  // Confidence increases with more posts, maxing out around 25 posts
  if (postCount < 5) return 0.3;
  if (postCount < 10) return 0.5;
  if (postCount < 15) return 0.7;
  if (postCount < 25) return 0.85;
  return 0.95;
}

/**
 * Build the analysis prompt for extracting writing style from historical posts
 */
export function buildAnalysisPrompt(posts: HistoricalPost[]): string {
  const formattedPosts = formatPostsForAnalysis(posts);
  const postCount = posts.length;

  return `# TASK: Analyze Writing Style from Historical Posts

You are an expert at analyzing writing patterns and personal branding styles. Your task is to analyze the following ${postCount} social media posts written by the same author and extract their unique writing style.

## POSTS TO ANALYZE

${formattedPosts}

## ANALYSIS INSTRUCTIONS

Carefully analyze these posts to identify:

1. **Tone Tags**: Identify 3-7 adjectives that describe the author's consistent tone and voice (e.g., professional, friendly, witty, inspirational, technical, casual, authoritative)

2. **DO Rules**: Extract 3-6 specific patterns or techniques the author consistently uses that work well. Be specific and actionable (e.g., "Start posts with a question", "Use numbered lists for tips", "Include personal anecdotes")

3. **DON'T Rules**: Identify 2-4 things the author avoids or should avoid based on their style (e.g., "Avoid technical jargon", "Don't use all caps", "Avoid overly formal language")

4. **Style Insights**: Analyze quantitative aspects of their writing style

## OUTPUT FORMAT

Respond with ONLY a valid JSON object in the following exact format (no markdown, no explanation, just the JSON):

{
  "toneTags": ["tag1", "tag2", "tag3"],
  "doRules": ["Rule 1 with specific guidance", "Rule 2 with specific guidance"],
  "dontRules": ["Avoid doing X", "Don't use Y"],
  "styleInsights": {
    "averageLength": "short|medium|long",
    "emojiUsage": "none|minimal|moderate|heavy",
    "hashtagUsage": "none|minimal|moderate|heavy",
    "questionUsage": "none|low|moderate|high",
    "callToActionUsage": "none|low|moderate|high"
  }
}

Guidelines for styleInsights:
- averageLength: "short" (<100 words), "medium" (100-300 words), "long" (>300 words)
- emojiUsage: "none" (0), "minimal" (1-2 per post), "moderate" (3-5), "heavy" (6+)
- hashtagUsage: "none" (0), "minimal" (1-2), "moderate" (3-5), "heavy" (6+)
- questionUsage: Based on frequency of rhetorical or engagement questions
- callToActionUsage: Based on how often posts include CTAs

Be specific and practical in your rules. Focus on patterns that appear consistently across multiple posts.`;
}

/**
 * Parse the AI response into a StyleAnalysisResult
 */
export function parseAnalysisResponse(
  response: string,
  postCount: number,
): StyleAnalysisResult | null {
  try {
    // Try to extract JSON from the response (in case there's extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.toneTags || !Array.isArray(parsed.toneTags)) {
      return null;
    }
    if (!parsed.doRules || !Array.isArray(parsed.doRules)) {
      return null;
    }
    if (!parsed.dontRules || !Array.isArray(parsed.dontRules)) {
      return null;
    }
    if (!parsed.styleInsights || typeof parsed.styleInsights !== 'object') {
      return null;
    }

    // Validate and normalize styleInsights
    const validLengths = ['short', 'medium', 'long'];
    const validUsageLevels = ['none', 'minimal', 'moderate', 'heavy'];
    const validFrequencyLevels = ['none', 'low', 'moderate', 'high'];

    const styleInsights = {
      averageLength: validLengths.includes(parsed.styleInsights.averageLength)
        ? parsed.styleInsights.averageLength
        : 'medium',
      emojiUsage: validUsageLevels.includes(parsed.styleInsights.emojiUsage)
        ? parsed.styleInsights.emojiUsage
        : 'minimal',
      hashtagUsage: validUsageLevels.includes(parsed.styleInsights.hashtagUsage)
        ? parsed.styleInsights.hashtagUsage
        : 'minimal',
      questionUsage: validFrequencyLevels.includes(parsed.styleInsights.questionUsage)
        ? parsed.styleInsights.questionUsage
        : 'low',
      callToActionUsage: validFrequencyLevels.includes(parsed.styleInsights.callToActionUsage)
        ? parsed.styleInsights.callToActionUsage
        : 'low',
    } as StyleAnalysisResult['styleInsights'];

    return {
      toneTags: parsed.toneTags.slice(0, 10), // Limit to 10 tags
      doRules: parsed.doRules.slice(0, 10), // Limit to 10 rules
      dontRules: parsed.dontRules.slice(0, 10), // Limit to 10 rules
      styleInsights,
      confidence: calculateConfidence(postCount),
    };
  } catch {
    return null;
  }
}

/**
 * Validate that enough posts exist for meaningful analysis
 */
export function validatePostsForAnalysis(posts: HistoricalPost[]): {
  valid: boolean;
  error?: string;
} {
  if (!posts || posts.length === 0) {
    return { valid: false, error: 'No historical posts found for analysis' };
  }

  if (posts.length < 5) {
    return {
      valid: false,
      error: `Minimum 5 posts required for analysis. Currently have ${posts.length} posts.`,
    };
  }

  // Check for minimum content quality
  const validPosts = posts.filter((p) => p.content && p.content.trim().length > 20);
  if (validPosts.length < 5) {
    return {
      valid: false,
      error: 'Not enough posts with substantial content (minimum 20 characters each)',
    };
  }

  return { valid: true };
}

export default {
  buildAnalysisPrompt,
  parseAnalysisResponse,
  validatePostsForAnalysis,
  calculateConfidence,
};
