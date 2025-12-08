/**
 * Application global constants
 */

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const JWT = {
  DEFAULT_EXPIRES_IN: '7d',
} as const;

export const OPENAI = {
  DEFAULT_MODEL: 'gpt-4.1-mini',
  DEFAULT_MAX_TOKENS: 1500,
  DEFAULT_TEMPERATURE: 0.7,
  GENERATION: {
    temperature: 0.8,
    maxTokens: 1500,
  },
  ITERATION: {
    temperature: 0.3,
    maxTokens: 1500,
  },
} as const;

export const PLATFORMS = {
  LINKEDIN: {
    name: 'LinkedIn',
    maxLength: 3000,
  },
  TWITTER: {
    name: 'X (Twitter)',
    maxLength: 280,
  },
  TIKTOK: {
    name: 'TikTok',
    maxLength: 2200,
  },
  INSTAGRAM: {
    name: 'Instagram',
    maxLength: 2200,
  },
} as const;

// Type exports for use in other files
export type PlatformKey = keyof typeof PLATFORMS;
export type PlatformConfig = (typeof PLATFORMS)[PlatformKey];

// Supported platforms for generation (LinkedIn only for now)
export const SUPPORTED_PLATFORMS = {
  LINKEDIN: 'linkedin',
} as const;

export const SUPPORTED_PLATFORM_NAMES = ['linkedin'] as const;
export type SupportedPlatform = (typeof SUPPORTED_PLATFORM_NAMES)[number];

/**
 * Check if a platform name is supported for generation
 */
export function isPlatformSupported(platformName: string): boolean {
  return SUPPORTED_PLATFORM_NAMES.some((supported) =>
    platformName.toLowerCase().includes(supported),
  );
}

// LinkedIn-specific guidelines for 2025
export const LINKEDIN_GUIDELINES = {
  OPTIMAL_MIN_LENGTH: 1200,
  OPTIMAL_MAX_LENGTH: 1800,
  MAX_LENGTH: 3000,
  MAX_HASHTAGS: 5,
  MAX_EMOJIS: 3,
  HOOK_MAX_LINES: 3,
} as const;
