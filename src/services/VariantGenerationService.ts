import { llmService } from './LLMService';
import { PostVariant, VariantApproach, VARIANT_APPROACHES } from '../types/variant';
import { buildPrompt, PromptContext, detectPostFormat } from '../utils/promptBuilder';

/**
 * Service for generating post variants with different approaches.
 *
 * This service generates multiple versions of the same post, each using a different
 * strategic approach (direct, storytelling, data-driven, emotional) to help users
 * A/B test and find the most effective content style for their audience.
 *
 * @example
 * ```typescript
 * const service = new VariantGenerationService();
 * const variants = await service.generateVariants(context, 3);
 * // Returns 3 variants: direct, storytelling, data-driven
 * ```
 */
export class VariantGenerationService {
  /**
   * Generate multiple variants of a post with different strategic approaches.
   *
   * Each variant uses a distinct temperature and writing style:
   * - **Direct** (0.5): Concise, factual, straight to the point
   * - **Storytelling** (0.7): Narrative with personal anecdotes
   * - **Data-Driven** (0.6): Statistics, research, logical arguments
   * - **Emotional** (0.8): Empathetic, inspirational, motivational
   *
   * Variants are generated in parallel for optimal performance. The post format
   * (Story/Opinion/Debate) is detected once and applied to all variants.
   *
   * @param context - The prompt context including rawIdea, goal, profile, platform, etc.
   * @param count - Number of variants to generate (default: 3, max: 4)
   * @returns Array of PostVariant objects with text, approach, format, and token usage
   *
   * @example
   * ```typescript
   * const variants = await service.generateVariants({
   *   rawIdea: "Share insights about remote work productivity",
   *   goal: "Educate and engage",
   *   profile: myProfile,
   *   platform: linkedInPlatform
   * }, 3);
   *
   * // Returns:
   * // [
   * //   { version: 1, text: "...", approach: "direct", format: "opinion", usage: {...} },
   * //   { version: 2, text: "...", approach: "storytelling", format: "story", usage: {...} },
   * //   { version: 3, text: "...", approach: "data-driven", format: "opinion", usage: {...} }
   * // ]
   * ```
   */
  async generateVariants(
    context: PromptContext,
    count: number = 3,
  ): Promise<PostVariant[]> {
    // Determine which approaches to use
    const approaches = this.selectApproaches(count);

    // Detect format once for all variants
    const format = detectPostFormat(context.goal, context.rawIdea);

    // Generate variants in parallel for better performance
    const variantPromises = approaches.map((approach, index) =>
      this.generateSingleVariant(context, approach, index + 1, format),
    );

    const variants = await Promise.all(variantPromises);
    return variants;
  }

  /**
   * Generate a single variant with a specific approach.
   *
   * This is called internally by generateVariants() for each approach.
   * It builds the base prompt, adds approach-specific instructions, and
   * uses the approach's optimal temperature setting.
   *
   * @param context - The prompt context
   * @param approach - The variant approach (direct, storytelling, data-driven, emotional)
   * @param version - The version number for this variant
   * @param format - The detected LinkedIn format (story, opinion, debate)
   * @returns A PostVariant object with the generated text and metadata
   *
   * @private
   */
  private async generateSingleVariant(
    context: PromptContext,
    approach: VariantApproach,
    version: number,
    format: any,
  ): Promise<PostVariant> {
    const metadata = VARIANT_APPROACHES[approach];

    // Build base prompt
    let prompt = buildPrompt(context);

    // Add approach-specific instructions
    prompt += this.buildApproachInstructions(approach);

    // Generate with approach-specific temperature
    const result = await llmService.generate({
      prompt,
      maxTokens: 2000,
      temperature: metadata.temperature,
    });

    return {
      version,
      text: result.text,
      approach,
      format,
      usage: result.usage,
    };
  }

  /**
   * Select which approaches to use based on the requested count.
   *
   * Approaches are selected in priority order:
   * 1. direct - Best for conversions and clarity
   * 2. storytelling - Best for engagement and authenticity
   * 3. data-driven - Best for credibility and B2B
   * 4. emotional - Best for inspiration and community building
   *
   * @param count - Number of variants requested (capped at 4)
   * @returns Array of selected approaches in priority order
   *
   * @example
   * ```typescript
   * selectApproaches(2) // Returns: ['direct', 'storytelling']
   * selectApproaches(4) // Returns: ['direct', 'storytelling', 'data-driven', 'emotional']
   * selectApproaches(5) // Returns: ['direct', 'storytelling', 'data-driven', 'emotional'] (capped at 4)
   * ```
   *
   * @private
   */
  private selectApproaches(count: number): VariantApproach[] {
    const allApproaches: VariantApproach[] = ['direct', 'storytelling', 'data-driven', 'emotional'];

    // Limit to max 4 variants (one per approach)
    const numVariants = Math.min(count, 4);

    return allApproaches.slice(0, numVariants);
  }

  /**
   * Build approach-specific instructions to append to the base prompt.
   *
   * Each approach gets tailored writing guidance to ensure consistent
   * and distinctive output. These instructions are added to the end of
   * the standard prompt to guide the LLM toward the desired style.
   *
   * Approach-specific guidance:
   * - **direct**: Clear, concise, actionable, minimal fluff
   * - **storytelling**: Personal narrative, vulnerability, arc structure
   * - **data-driven**: Stats, research, logical arguments, evidence
   * - **emotional**: Empathy, inspiration, emotional connection
   *
   * @param approach - The variant approach to build instructions for
   * @returns Formatted markdown instructions to append to the prompt
   *
   * @example
   * ```typescript
   * const instructions = this.buildApproachInstructions('storytelling');
   * // Returns detailed storytelling guidance with temperature info
   * ```
   *
   * @private
   */
  private buildApproachInstructions(approach: VariantApproach): string {
    const metadata = VARIANT_APPROACHES[approach];

    let instructions = '\n\n## APPROACH GUIDANCE\n\n';
    instructions += `This variant should use a **${approach}** approach.\n\n`;

    switch (approach) {
      case 'direct':
        instructions += '**Direct Approach:**\n';
        instructions += '- Get straight to the point\n';
        instructions += '- Minimize fluff and intro\n';
        instructions += '- Use clear, simple language\n';
        instructions += '- Focus on actionable takeaways\n';
        instructions += '- Keep sentences short and punchy\n';
        break;

      case 'storytelling':
        instructions += '**Storytelling Approach:**\n';
        instructions += '- Start with a personal anecdote or moment\n';
        instructions += '- Create a narrative arc (context → problem → resolution)\n';
        instructions += '- Use vivid, specific details\n';
        instructions += '- Make it relatable and human\n';
        instructions += '- Show vulnerability or learning\n';
        break;

      case 'data-driven':
        instructions += '**Data-Driven Approach:**\n';
        instructions += '- Lead with facts, statistics, or research\n';
        instructions += '- Support claims with numbers\n';
        instructions += '- Use logical argumentation\n';
        instructions += '- Cite credible sources (you can use plausible stats)\n';
        instructions += '- Focus on evidence and proof\n';
        break;

      case 'emotional':
        instructions += '**Emotional Approach:**\n';
        instructions += '- Connect on a feeling level\n';
        instructions += '- Use empathetic language\n';
        instructions += '- Acknowledge struggles and challenges\n';
        instructions += '- Create emotional resonance\n';
        instructions += '- Focus on hope, inspiration, or motivation\n';
        break;
    }

    instructions += `\nTemperature setting: ${metadata.temperature} (${metadata.description})\n`;

    return instructions;
  }
}

// Export singleton instance
export const variantGenerationService = new VariantGenerationService();
export default variantGenerationService;
