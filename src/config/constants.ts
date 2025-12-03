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
  DEFAULT_MAX_TOKENS: 1000,
  DEFAULT_TEMPERATURE: 0.7,
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
