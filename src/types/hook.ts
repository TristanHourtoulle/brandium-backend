/**
 * Hook types for LinkedIn posts
 *
 * Different hook styles that can be generated to grab attention
 */
export type HookType = 'question' | 'stat' | 'story' | 'bold_opinion';

/**
 * A generated hook suggestion
 */
export interface Hook {
  type: HookType;
  text: string;
  estimatedEngagement: number; // 1-10 score
}

/**
 * Context for generating hooks
 */
export interface HookGenerationContext {
  rawIdea: string;
  goal?: string;
  profile?: {
    name?: string;
    bio?: string;
    toneTags?: string[];
  };
  count?: number; // Number of hooks to generate (default: 4)
}

/**
 * Metadata for each hook type
 */
export interface HookTypeMetadata {
  type: HookType;
  description: string;
  example: string;
  engagementLevel: number; // Average engagement 1-10
}

/**
 * Metadata for all hook types
 */
export const HOOK_TYPES: Record<HookType, HookTypeMetadata> = {
  question: {
    type: 'question',
    description: 'Start with a provocative or relatable question',
    example: 'Ever wonder why 90% of developers burn out before age 40?',
    engagementLevel: 8,
  },
  stat: {
    type: 'stat',
    description: 'Open with a surprising statistic or data point',
    example: '73% of professionals say they learned more from failures than successes.',
    engagementLevel: 7,
  },
  story: {
    type: 'story',
    description: 'Begin with a personal story or moment',
    example: 'Last Tuesday, I made a mistake that cost me 3 clients...',
    engagementLevel: 9,
  },
  bold_opinion: {
    type: 'bold_opinion',
    description: 'Start with a controversial or contrarian statement',
    example: 'Stop doing daily standups. They\'re killing your productivity.',
    engagementLevel: 8,
  },
};

/**
 * Validate that a string is a valid hook type
 */
export function isValidHookType(type: string): type is HookType {
  return type in HOOK_TYPES;
}

/**
 * Get metadata for a hook type
 */
export function getHookTypeMetadata(type: HookType): HookTypeMetadata {
  return HOOK_TYPES[type];
}

/**
 * Get all available hook types
 */
export function getAllHookTypes(): HookType[] {
  return Object.keys(HOOK_TYPES) as HookType[];
}
