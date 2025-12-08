import { IterationType } from '../types/iteration';

/**
 * Build specialized iteration instructions based on iteration type.
 *
 * This is the main entry point for creating iteration prompts. It generates
 * targeted, surgical instructions for the LLM to refine a post in specific ways:
 *
 * **Iteration Types**:
 * - `shorter`: Reduce length by ~30% while keeping essence
 * - `stronger_hook`: Improve the first 2-3 lines for attention
 * - `more_personal`: Add authentic anecdotes and vulnerability
 * - `add_data`: Include statistics, metrics, or research
 * - `simplify`: Remove jargon and complex language
 * - `custom`: Apply user-provided feedback
 *
 * Each type has a dedicated prompt builder function that provides specific,
 * actionable guidance to the LLM on what to change and what to preserve.
 *
 * @param type - The iteration type to apply
 * @param previousText - The current version of the post to iterate on
 * @param customFeedback - Required when type is 'custom', otherwise ignored
 * @returns Formatted prompt instructions for the LLM
 *
 * @throws {Error} If type is 'custom' but customFeedback is empty/missing
 * @throws {Error} If type is unknown
 *
 * @example
 * ```typescript
 * // Shorten a post
 * const prompt = buildSpecializedIterationPrompt('shorter', longPost);
 *
 * // Custom iteration
 * const prompt = buildSpecializedIterationPrompt(
 *   'custom',
 *   currentPost,
 *   'Add a specific example from the tech industry'
 * );
 * ```
 */
export function buildSpecializedIterationPrompt(
  type: IterationType,
  previousText: string,
  customFeedback?: string,
): string {
  // For custom type, use the provided feedback
  if (type === 'custom') {
    if (!customFeedback || customFeedback.trim() === '') {
      throw new Error('customFeedback is required when type is "custom"');
    }
    return customFeedback.trim();
  }

  // Build specialized prompt based on type
  switch (type) {
    case 'shorter':
      return buildShorterPrompt(previousText);

    case 'stronger_hook':
      return buildStrongerHookPrompt(previousText);

    case 'more_personal':
      return buildMorePersonalPrompt(previousText);

    case 'add_data':
      return buildAddDataPrompt(previousText);

    case 'simplify':
      return buildSimplifyPrompt(previousText);

    default:
      throw new Error(`Unknown iteration type: ${type}`);
  }
}

/**
 * SHORTER: Condense the post while keeping the essence.
 *
 * Creates a prompt that targets ~30% length reduction by:
 * - Removing redundant phrases and filler words
 * - Cutting secondary details and examples
 * - Preserving the core message, hook, and CTA
 *
 * The target length is calculated dynamically based on current length.
 * This iteration is ideal for posts that are too verbose or exceed
 * platform character limits.
 *
 * @param previousText - The current post text
 * @returns Prompt instructions for shortening
 */
function buildShorterPrompt(previousText: string): string {
  const currentLength = previousText.length;
  const targetLength = Math.floor(currentLength * 0.7); // Aim for 30% reduction

  return `Make this post more concise. Target: ~${targetLength} characters (currently ${currentLength}).

RULES:
- Remove redundant phrases and filler words
- Keep only the essential message
- Preserve the hook and CTA
- Maintain the core value proposition
- DO NOT change the tone or style
- DO NOT add new content

Focus on compression, not rewriting.`;
}

/**
 * STRONGER_HOOK: Improve the opening 2-3 lines for maximum attention.
 *
 * Rewrites only the hook (first 2-3 lines) using pattern interruption
 * techniques to stop the scroll:
 * - Bold statements that challenge common beliefs
 * - Provocative questions that spark curiosity
 * - Shocking statistics or counter-intuitive facts
 * - Personal revelations that create intrigue
 *
 * The rest of the post remains unchanged. This is ideal when a post
 * has strong content but weak opening engagement.
 *
 * @param previousText - The current post text
 * @returns Prompt instructions for improving the hook
 */
function buildStrongerHookPrompt(previousText: string): string {
  const lines = previousText.split('\n').filter((l) => l.trim());
  const hookLines = lines.slice(0, 3).join('\n');

  return `Rewrite ONLY the hook (first 2-3 lines) to make it more attention-grabbing.

Current hook:
"""
${hookLines}
"""

RULES:
- Make it more surprising, provocative, or intriguing
- Use pattern interruption (challenge a common belief, ask a bold question, share a shocking stat)
- Keep the same length (2-3 lines)
- Keep the rest of the post EXACTLY as is
- DO NOT change anything after the hook

Techniques to try:
→ Bold statement: "Stop doing X. Here's why."
→ Provocative question: "Why does everyone get X wrong?"
→ Counter-intuitive fact: "X doesn't work. Here's what does."
→ Personal revelation: "I made a mistake that cost me X..."`;
}

/**
 * MORE_PERSONAL: Add authentic personal experiences or anecdotes.
 *
 * Inserts 2-4 lines of personal story or real-world example to make
 * the post more relatable and authentic. Uses specific details:
 * - Concrete moments ("Last Tuesday, I...")
 * - Specific numbers ("After 6 months of trying...")
 * - Real consequences ("This mistake cost me 3 clients...")
 * - Honest admissions ("I used to believe X, until...")
 *
 * The personal element is strategically placed (after hook or in middle)
 * to strengthen emotional connection without exceeding +30% length.
 *
 * @param previousText - The current post text
 * @returns Prompt instructions for adding personal content
 */
function buildMorePersonalPrompt(_previousText: string): string {
  return `Add a personal anecdote or concrete example to make this post more relatable.

RULES:
- Insert 2-4 lines of personal story or real-world example
- Place it strategically (after the hook or in the middle)
- Use specific details (numbers, names, situations)
- Make it authentic and vulnerable
- Keep everything else EXACTLY the same

What to add:
→ A specific moment: "Last Tuesday, I..."
→ A concrete number: "After 6 months of trying..."
→ A real consequence: "This mistake cost me 3 clients..."
→ An honest admission: "I used to believe X, until..."

DO NOT make the post longer than +30% of original length.`;
}

/**
 * ADD_DATA: Include statistics, numbers, or concrete data for credibility.
 *
 * Adds 1-2 data points to strengthen arguments with evidence:
 * - Realistic percentages ("73% of professionals struggle with...")
 * - Research findings ("Studies show X leads to 40% increase...")
 * - Survey results ("In a survey of 500 developers...")
 * - Plausible metrics ("After analyzing 1,000 cases...")
 *
 * Data is integrated naturally into existing sentences. The LLM is
 * instructed to use realistic numbers but avoid citing specific sources
 * (no "Harvard study" or "MIT research").
 *
 * @param previousText - The current post text
 * @returns Prompt instructions for adding data
 */
function buildAddDataPrompt(_previousText: string): string {
  return `Add concrete data, statistics, or metrics to strengthen the credibility.

RULES:
- Add 1-2 data points (statistics, percentages, research findings)
- Place them where they support your argument
- Use realistic, plausible numbers (you can cite "studies show" or "research indicates")
- Integrate them naturally into existing sentences
- Keep everything else unchanged

Examples of what to add:
→ "73% of professionals struggle with..."
→ "Studies show that X leads to a 40% increase in..."
→ "After analyzing 1,000 cases, researchers found..."
→ "In a survey of 500 developers..."

DO NOT invent specific sources (no "Harvard study" or "MIT research" unless generic).
Keep it brief and integrated.`;
}

/**
 * SIMPLIFY: Reduce complexity and eliminate jargon.
 *
 * Simplifies language to 6-9 year old reading level by:
 * - Replacing complex words ("utilize" → "use")
 * - Shortening long sentences (max 15-20 words)
 * - Removing or explaining technical jargon
 * - Using active voice instead of passive
 * - Breaking long paragraphs into shorter ones
 *
 * Common transformations:
 * - "leverage" → "use" or "take advantage of"
 * - "implement" → "do" or "add"
 * - "optimize" → "improve" or "make better"
 *
 * Tone and personality are preserved, just made more accessible.
 *
 * @param previousText - The current post text
 * @returns Prompt instructions for simplification
 */
function buildSimplifyPrompt(_previousText: string): string {
  return `Simplify the language to make it more accessible (target: 6-9 year old reading level).

RULES:
- Replace complex words with simpler alternatives
- Shorten long sentences (max 15-20 words per sentence)
- Remove or explain technical jargon
- Use active voice instead of passive
- Break long paragraphs into shorter ones
- Keep the same message and structure

Simplification guidelines:
→ Instead of "utilize" → use "use"
→ Instead of "implement" → use "do" or "add"
→ Instead of "leverage" → use "use" or "take advantage of"
→ Instead of "optimize" → use "improve" or "make better"
→ Break complex ideas into simple steps

Maintain the tone and personality, just make it easier to read.`;
}

/**
 * Estimate the character length of text.
 *
 * Simple utility that returns the exact character count of the provided text.
 * Used internally for calculating target lengths in the `shorter` iteration.
 *
 * @param text - The text to measure
 * @returns Character count
 *
 * @example
 * ```typescript
 * estimateLength("Hello world"); // Returns: 11
 * ```
 */
export function estimateLength(text: string): number {
  return text.length;
}

/**
 * Extract the hook (first 2-3 lines) from a post.
 *
 * Splits the post by newlines, filters out empty lines, and returns
 * the first 3 non-empty lines joined back together. Used by the
 * `stronger_hook` prompt builder to identify what needs rewriting.
 *
 * @param text - The post text to extract from
 * @returns The first 2-3 lines of the post
 *
 * @example
 * ```typescript
 * const post = "Hook line 1\nHook line 2\n\nBody text...";
 * extractHook(post); // Returns: "Hook line 1\nHook line 2"
 * ```
 */
export function extractHook(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim());
  return lines.slice(0, 3).join('\n');
}

/**
 * Validate iteration prompt parameters before building the prompt.
 *
 * Ensures that:
 * 1. `previousText` is provided and non-empty
 * 2. `customFeedback` is provided when type is 'custom'
 *
 * Returns a validation result object with `valid` boolean and optional
 * `error` message. This prevents runtime errors and provides clear
 * error messages for API validation.
 *
 * @param type - The iteration type
 * @param previousText - The current post text
 * @param customFeedback - Optional custom feedback (required for 'custom' type)
 * @returns Validation result with { valid, error? }
 *
 * @example
 * ```typescript
 * const result = validateIterationPromptParams('shorter', '');
 * // Returns: { valid: false, error: 'previousText is required...' }
 *
 * const result2 = validateIterationPromptParams('custom', 'text');
 * // Returns: { valid: false, error: 'customFeedback is required...' }
 *
 * const result3 = validateIterationPromptParams('shorter', 'Some text');
 * // Returns: { valid: true }
 * ```
 */
export function validateIterationPromptParams(
  type: IterationType,
  previousText: string,
  customFeedback?: string,
): { valid: boolean; error?: string } {
  if (!previousText || previousText.trim() === '') {
    return { valid: false, error: 'previousText is required and cannot be empty' };
  }

  if (type === 'custom' && (!customFeedback || customFeedback.trim() === '')) {
    return { valid: false, error: 'customFeedback is required when type is "custom"' };
  }

  return { valid: true };
}

export default {
  buildSpecializedIterationPrompt,
  estimateLength,
  extractHook,
  validateIterationPromptParams,
};
