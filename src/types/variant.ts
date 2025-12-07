/**
 * Variant generation types
 *
 * Support for generating multiple versions of a post with different approaches
 */

import { PostFormat } from '../utils/promptBuilder';

/**
 * Generation approach for variants
 */
export type VariantApproach = 'direct' | 'storytelling' | 'data-driven' | 'emotional';

/**
 * A generated post variant
 */
export interface PostVariant {
  version: number;
  text: string;
  approach: VariantApproach;
  format: PostFormat;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Metadata for each approach
 */
export interface ApproachMetadata {
  approach: VariantApproach;
  description: string;
  temperature: number;
  focus: string;
}

/**
 * Metadata for all approaches
 */
export const VARIANT_APPROACHES: Record<VariantApproach, ApproachMetadata> = {
  direct: {
    approach: 'direct',
    description: 'Straight to the point, clear and concise',
    temperature: 0.5,
    focus: 'Clarity and brevity',
  },
  storytelling: {
    approach: 'storytelling',
    description: 'Narrative-driven with personal touch',
    temperature: 0.7,
    focus: 'Storytelling and emotion',
  },
  'data-driven': {
    approach: 'data-driven',
    description: 'Fact-based with statistics and logic',
    temperature: 0.6,
    focus: 'Facts, stats, and credibility',
  },
  emotional: {
    approach: 'emotional',
    description: 'Empathetic and feeling-focused',
    temperature: 0.8,
    focus: 'Emotions and human connection',
  },
};

/**
 * Validate that a string is a valid approach
 */
export function isValidApproach(approach: string): approach is VariantApproach {
  return approach in VARIANT_APPROACHES;
}

/**
 * Get metadata for an approach
 */
export function getApproachMetadata(approach: VariantApproach): ApproachMetadata {
  return VARIANT_APPROACHES[approach];
}

/**
 * Get all available approaches
 */
export function getAllApproaches(): VariantApproach[] {
  return Object.keys(VARIANT_APPROACHES) as VariantApproach[];
}
