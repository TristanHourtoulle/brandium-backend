import { llmService } from './LLMService';
import { Hook, HookType, HookGenerationContext, HOOK_TYPES } from '../types/hook';
import { Profile } from '../models/Profile';

/**
 * Service for generating hook suggestions for LinkedIn posts.
 *
 * Hooks are attention-grabbing opening lines designed to stop the scroll
 * and make readers want to engage with your content. This service generates
 * 4 different types of hooks optimized for different psychological triggers:
 * - **Question**: Curiosity-driven, makes readers think
 * - **Stat**: Data-backed, builds credibility
 * - **Story**: Personal, creates emotional connection
 * - **Bold Opinion**: Provocative, challenges assumptions
 *
 * @example
 * ```typescript
 * const service = new HookGenerationService();
 * const hooks = await service.generateHooks({
 *   rawIdea: "Share lessons about entrepreneurship",
 *   goal: "Inspire and educate",
 *   profile: myProfile,
 *   count: 4
 * });
 * // Returns 4 hooks (one of each type) with engagement scores
 * ```
 */
export class HookGenerationService {
  /**
   * Generate multiple hook suggestions based on context.
   *
   * This method uses a higher temperature (0.8) to encourage creative,
   * attention-grabbing hooks. It generates exactly `count` hooks (default 4),
   * one for each hook type (question, stat, story, bold_opinion).
   *
   * Each hook includes:
   * - `type`: The hook category (question/stat/story/bold_opinion)
   * - `text`: The actual hook text (1-3 lines)
   * - `estimatedEngagement`: Predicted engagement score (1-10)
   *
   * Fallback mechanism: If LLM response parsing fails, the service will
   * attempt to extract hooks from raw text, and as last resort, use
   * example hooks from HOOK_TYPES metadata.
   *
   * @param context - Hook generation context with rawIdea, goal, profile, and count
   * @returns Array of Hook objects with type, text, and engagement score
   *
   * @example
   * ```typescript
   * const hooks = await hookGenerationService.generateHooks({
   *   rawIdea: "Talk about remote work productivity",
   *   goal: "Educate professionals",
   *   profile: professionalProfile,
   *   count: 4
   * });
   *
   * // Returns:
   * // [
   * //   { type: "question", text: "Ever wonder why...", estimatedEngagement: 9 },
   * //   { type: "stat", text: "83% of entrepreneurs...", estimatedEngagement: 8 },
   * //   { type: "story", text: "Three months ago, I...", estimatedEngagement: 9 },
   * //   { type: "bold_opinion", text: "Stop following your passion...", estimatedEngagement: 8 }
   * // ]
   * ```
   */
  async generateHooks(context: HookGenerationContext): Promise<Hook[]> {
    const { rawIdea, goal, profile, count = 4 } = context;

    // Build the prompt for hook generation
    const prompt = this.buildHookGenerationPrompt(rawIdea, goal, profile, count);

    // Generate hooks using LLM
    const result = await llmService.generate({
      prompt,
      maxTokens: 800,
      temperature: 0.8, // Higher temperature for creative hooks
    });

    // Parse the response into Hook objects
    const hooks = this.parseHooksFromResponse(result.text);

    return hooks;
  }

  /**
   * Build the prompt for generating hooks.
   *
   * This method constructs a detailed prompt that:
   * 1. Includes profile context (name, bio, tone) if available
   * 2. Specifies the post's raw idea and goal
   * 3. Provides clear examples for each hook type
   * 4. Defines exact output format for parsing
   * 5. Sets rules for authenticity and engagement
   *
   * The prompt asks for hooks in a structured format:
   * ```
   * [TYPE: question|stat|story|bold_opinion]
   * [HOOK: hook text here]
   * [ENGAGEMENT: 1-10]
   * ---
   * ```
   *
   * @param rawIdea - The core idea for the post
   * @param goal - Optional goal or objective for the post
   * @param profile - Optional profile context for personalization
   * @param count - Number of hooks to generate (default: 4)
   * @returns Formatted prompt string for LLM
   *
   * @private
   */
  private buildHookGenerationPrompt(
    rawIdea: string,
    goal?: string,
    profile?: Partial<Profile>,
    count: number = 4,
  ): string {
    let prompt = '# TASK: Generate Hook Suggestions for LinkedIn Post\n\n';

    // Add context
    if (profile) {
      prompt += '## Profile Context\n';
      if (profile.name) prompt += `Author: ${profile.name}\n`;
      if (profile.bio) prompt += `Bio: ${profile.bio}\n`;
      if (profile.toneTags && profile.toneTags.length > 0) {
        prompt += `Tone: ${profile.toneTags.join(', ')}\n`;
      }
      prompt += '\n';
    }

    prompt += '## Post Context\n';
    prompt += `Raw Idea: ${rawIdea}\n`;
    if (goal) prompt += `Goal: ${goal}\n`;
    prompt += '\n';

    // Add hook type instructions
    prompt += '## Your Task\n\n';
    prompt += `Generate exactly ${count} different opening hooks for a LinkedIn post based on the context above.\n`;
    prompt += 'Each hook should be 1-3 lines maximum and grab attention immediately.\n\n';

    prompt += '## Hook Types to Generate:\n\n';
    prompt += '1. **QUESTION** - A provocative or relatable question that makes readers curious\n';
    prompt += '   Example: "Ever wonder why 90% of developers burn out before age 40?"\n\n';

    prompt += '2. **STAT** - A surprising statistic or data point (can be realistic/plausible)\n';
    prompt += '   Example: "73% of professionals say they learned more from failures than successes."\n\n';

    prompt += '3. **STORY** - A personal moment or anecdote (create a realistic scenario)\n';
    prompt += '   Example: "Last Tuesday, I made a mistake that cost me 3 clients..."\n\n';

    prompt += '4. **BOLD_OPINION** - A controversial or contrarian statement\n';
    prompt += '   Example: "Stop doing daily standups. They\'re killing your productivity."\n\n';

    prompt += '## Output Format\n\n';
    prompt += 'For each hook, output EXACTLY in this format:\n\n';
    prompt += '[TYPE: question|stat|story|bold_opinion]\n';
    prompt += '[HOOK: your hook text here]\n';
    prompt += '[ENGAGEMENT: number 1-10]\n';
    prompt += '---\n\n';

    prompt += '## Rules:\n';
    prompt += '- Write hooks in first person if the profile context suggests it\n';
    prompt += '- Keep hooks punchy and conversational\n';
    prompt += '- Make them scroll-stoppers - bold, surprising, or intriguing\n';
    prompt += '- Engagement score (1-10) should reflect how attention-grabbing the hook is\n';
    prompt += `- Generate exactly ${count} hooks, one of each type listed above\n`;
    prompt += '- DO NOT add any extra text, explanations, or commentary\n';

    return prompt;
  }

  /**
   * Parse hooks from LLM response using structured format.
   *
   * Expected format from LLM:
   * ```
   * [TYPE: question]
   * [HOOK: Ever wonder why most startups fail?]
   * [ENGAGEMENT: 9]
   * ---
   * [TYPE: stat]
   * [HOOK: 83% of entrepreneurs say...]
   * [ENGAGEMENT: 8]
   * ---
   * ```
   *
   * The method uses regex to extract:
   * - TYPE: The hook category
   * - HOOK: The actual hook text (can be multi-line)
   * - ENGAGEMENT: The engagement score (1-10)
   *
   * If parsing fails or produces < 4 hooks, falls back to
   * `generateFallbackHooks()` for robustness.
   *
   * @param response - Raw text response from LLM
   * @returns Array of parsed Hook objects
   *
   * @private
   */
  private parseHooksFromResponse(response: string): Hook[] {
    const hooks: Hook[] = [];
    const hookBlocks = response.split('---').filter(block => block.trim());

    for (const block of hookBlocks) {
      const typeMatch = block.match(/\[TYPE:\s*(question|stat|story|bold_opinion)\]/i);
      const hookMatch = block.match(/\[HOOK:\s*(.+?)\]/s);
      const engagementMatch = block.match(/\[ENGAGEMENT:\s*(\d+)\]/i);

      if (typeMatch?.[1] && hookMatch?.[1] && engagementMatch?.[1]) {
        const type = typeMatch[1].toLowerCase() as HookType;
        const text = hookMatch[1].trim();
        const estimatedEngagement = parseInt(engagementMatch[1], 10);

        hooks.push({
          type,
          text,
          estimatedEngagement: Math.min(10, Math.max(1, estimatedEngagement)),
        });
      }
    }

    // If parsing failed or not enough hooks, generate fallback hooks
    if (hooks.length < 4) {
      return this.generateFallbackHooks(response);
    }

    return hooks;
  }

  /**
   * Generate fallback hooks if structured parsing fails.
   *
   * This method provides a safety net when the LLM response doesn't
   * match the expected format. It tries three strategies in order:
   *
   * 1. **Line extraction**: Extracts hook-like lines (20-200 chars)
   * 2. **Type rotation**: Assigns hook types in round-robin fashion
   * 3. **Example fallback**: Uses predefined examples from HOOK_TYPES
   *
   * This ensures the API always returns exactly 4 hooks, even if
   * the LLM response is malformed or incomplete.
   *
   * @param rawResponse - The unparsed LLM response
   * @returns Array of 4 fallback Hook objects with default engagement (7)
   *
   * @private
   */
  private generateFallbackHooks(rawResponse: string): Hook[] {
    // Split by newlines and try to extract hook-like content
    const lines = rawResponse
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 20 && line.length < 200);

    const hooks: Hook[] = [];
    const types: HookType[] = ['question', 'stat', 'story', 'bold_opinion'];

    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const type = types[i % types.length];
      if (type) {
        hooks.push({
          type,
          text: lines[i] || '',
          estimatedEngagement: 7, // Default engagement score
        });
      }
    }

    // If still not enough, create simple fallback hooks
    while (hooks.length < 4) {
      const type = types[hooks.length % types.length];
      if (type) {
        const metadata = HOOK_TYPES[type];
        hooks.push({
          type,
          text: metadata.example,
          estimatedEngagement: metadata.engagementLevel,
        });
      }
    }

    return hooks.slice(0, 4);
  }

}

// Export singleton instance
export const hookGenerationService = new HookGenerationService();
export default hookGenerationService;
