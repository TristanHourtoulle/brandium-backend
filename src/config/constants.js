/**
 * Application global constants
 */

module.exports = {
  // Default pagination settings
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },

  // JWT settings
  JWT: {
    DEFAULT_EXPIRES_IN: '7d',
  },

  // OpenAI settings
  OPENAI: {
    DEFAULT_MODEL: 'gpt-4.1-mini',
    DEFAULT_MAX_TOKENS: 1000,
    DEFAULT_TEMPERATURE: 0.7,
  },

  // Predefined platforms
  PLATFORMS: {
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
  },
};
