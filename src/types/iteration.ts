/**
 * Specialized iteration types for post improvements
 *
 * These types allow users to quickly apply specific transformations
 * to their posts without writing custom feedback prompts
 */
export type IterationType =
  | 'shorter'
  | 'stronger_hook'
  | 'more_personal'
  | 'add_data'
  | 'simplify'
  | 'custom';

/**
 * Metadata for each iteration type
 */
export interface IterationTypeMetadata {
  type: IterationType;
  description: string;
  focusArea: string;
  example: string;
}

/**
 * Metadata for all supported iteration types
 */
export const ITERATION_TYPES: Record<IterationType, IterationTypeMetadata> = {
  shorter: {
    type: 'shorter',
    description: 'Condense the post while keeping its core message',
    focusArea: 'Length and brevity',
    example: 'Remove unnecessary details and focus on the essential message',
  },
  stronger_hook: {
    type: 'stronger_hook',
    description: 'Improve the opening lines to grab attention',
    focusArea: 'First 2-3 lines',
    example: 'Make the hook more compelling, surprising, or provocative',
  },
  more_personal: {
    type: 'more_personal',
    description: 'Add personal experience or anecdote',
    focusArea: 'Storytelling and authenticity',
    example: 'Include a concrete personal story or real-world example',
  },
  add_data: {
    type: 'add_data',
    description: 'Include statistics, numbers, or concrete data',
    focusArea: 'Facts and credibility',
    example: 'Add specific metrics, percentages, or research findings',
  },
  simplify: {
    type: 'simplify',
    description: 'Reduce complexity and technical jargon',
    focusArea: 'Readability and accessibility',
    example: 'Use simpler words and shorter sentences',
  },
  custom: {
    type: 'custom',
    description: 'Apply custom user feedback',
    focusArea: 'User-defined changes',
    example: 'Use the provided feedback parameter',
  },
};

/**
 * Validate that a string is a valid iteration type
 */
export function isValidIterationType(type: string): type is IterationType {
  return type in ITERATION_TYPES;
}

/**
 * Get metadata for an iteration type
 */
export function getIterationTypeMetadata(type: IterationType): IterationTypeMetadata {
  return ITERATION_TYPES[type];
}

/**
 * Get all available iteration types
 */
export function getAllIterationTypes(): IterationType[] {
  return Object.keys(ITERATION_TYPES) as IterationType[];
}
