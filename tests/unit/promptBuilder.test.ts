import {
  buildPrompt,
  estimateTokenCount,
  validatePromptContext,
  PromptContext,
} from '../../src/utils/promptBuilder';

describe('promptBuilder', () => {
  // =====================================
  // buildPrompt Tests
  // =====================================
  describe('buildPrompt', () => {
    it('should build a minimal prompt with only rawIdea', () => {
      const context: PromptContext = {
        rawIdea: 'Just launched a new feature!',
      };

      const prompt = buildPrompt(context);

      expect(prompt).toContain('Raw Idea to Transform');
      expect(prompt).toContain('Just launched a new feature!');
      expect(prompt).toContain('YOUR TASK');
    });

    it('should include profile context when provided', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        profile: {
          id: 'profile-123',
          name: 'Tristan - Freelance Dev',
          bio: 'Full-stack developer specializing in React',
          toneTags: ['professional', 'friendly'],
          doRules: ['Use clear language', 'Include CTAs'],
          dontRules: ['Avoid jargon', 'No all-caps'],
        } as never,
      };

      const prompt = buildPrompt(context);

      expect(prompt).toContain('PROFILE CONTEXT');
      expect(prompt).toContain('Tristan - Freelance Dev');
      expect(prompt).toContain('Full-stack developer specializing in React');
      expect(prompt).toContain('professional');
      expect(prompt).toContain('friendly');
      expect(prompt).toContain('Use clear language');
      expect(prompt).toContain('Avoid jargon');
    });

    it('should include project context when provided', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        project: {
          id: 'project-123',
          name: 'Edukai',
          description: 'AI-powered learning platform',
          audience: 'Students and educators',
          keyMessages: ['Adaptive learning', 'Personalized experience'],
        } as never,
      };

      const prompt = buildPrompt(context);

      expect(prompt).toContain('PROJECT CONTEXT');
      expect(prompt).toContain('Edukai');
      expect(prompt).toContain('AI-powered learning platform');
      expect(prompt).toContain('Students and educators');
      expect(prompt).toContain('Adaptive learning');
    });

    it('should include platform context when provided', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        platform: {
          id: 'platform-123',
          name: 'LinkedIn',
          styleGuidelines: 'Professional tone, use hashtags',
          maxLength: 3000,
        } as never,
      };

      const prompt = buildPrompt(context);

      expect(prompt).toContain('PLATFORM REQUIREMENTS');
      expect(prompt).toContain('LinkedIn');
      expect(prompt).toContain('Professional tone, use hashtags');
      expect(prompt).toContain('Maximum 3000 characters');
    });

    it('should include goal when provided', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        goal: 'Announce new feature launch',
      };

      const prompt = buildPrompt(context);

      expect(prompt).toContain('Goal');
      expect(prompt).toContain('Announce new feature launch');
    });

    it('should build complete prompt with all context', () => {
      const context: PromptContext = {
        rawIdea: 'Just shipped adaptive quizzes in Edukai!',
        goal: 'Generate excitement about the feature',
        profile: {
          id: 'profile-123',
          name: 'Tristan',
          bio: 'Building the future of education',
          toneTags: ['enthusiastic', 'tech-savvy'],
          doRules: ['Use emojis', 'Be concise'],
          dontRules: ['No buzzwords'],
        } as never,
        project: {
          id: 'project-123',
          name: 'Edukai',
          description: 'AI learning platform',
          audience: 'EdTech enthusiasts',
          keyMessages: ['Innovation', 'Accessibility'],
        } as never,
        platform: {
          id: 'platform-123',
          name: 'X (Twitter)',
          styleGuidelines: 'Short and punchy',
          maxLength: 280,
        } as never,
      };

      const prompt = buildPrompt(context);

      // Check all sections are present
      expect(prompt).toContain('PROFILE CONTEXT');
      expect(prompt).toContain('PROJECT CONTEXT');
      expect(prompt).toContain('PLATFORM REQUIREMENTS');
      expect(prompt).toContain('YOUR TASK');

      // Check content from each section
      expect(prompt).toContain('Tristan');
      expect(prompt).toContain('Edukai');
      expect(prompt).toContain('X (Twitter)');
      expect(prompt).toContain('280 characters');
      expect(prompt).toContain('adaptive quizzes');
    });

    it('should handle null/undefined fields gracefully', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        profile: {
          id: 'profile-123',
          name: 'Test Profile',
          bio: null,
          toneTags: [],
          doRules: [],
          dontRules: [],
        } as never,
      };

      const prompt = buildPrompt(context);

      expect(prompt).toContain('Test Profile');
      expect(prompt).not.toContain('undefined');
      expect(prompt).not.toContain('null');
    });

    it('should handle empty arrays gracefully', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        profile: {
          id: 'profile-123',
          name: 'Test Profile',
          bio: 'A bio',
          toneTags: [],
          doRules: [],
          dontRules: [],
        } as never,
      };

      const prompt = buildPrompt(context);

      // Should not include empty list sections
      expect(prompt).not.toContain('Tone & Style Tags\n-');
    });

    it('should not include platform maxLength section if not set', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        platform: {
          id: 'platform-123',
          name: 'Custom Platform',
          styleGuidelines: 'Be creative',
          maxLength: null,
        } as never,
      };

      const prompt = buildPrompt(context);

      expect(prompt).not.toContain('Character Limit');
      expect(prompt).not.toContain('Maximum');
    });
  });

  // =====================================
  // estimateTokenCount Tests
  // =====================================
  describe('estimateTokenCount', () => {
    it('should estimate token count for short text', () => {
      const text = 'Hello world'; // 11 chars
      const estimate = estimateTokenCount(text);

      // ~4 chars per token, so 11/4 = 2.75 -> 3
      expect(estimate).toBe(3);
    });

    it('should estimate token count for longer text', () => {
      const text = 'This is a longer piece of text that should result in more tokens.';
      const estimate = estimateTokenCount(text);

      expect(estimate).toBeGreaterThan(10);
      expect(estimate).toBeLessThan(30);
    });

    it('should handle empty string', () => {
      const estimate = estimateTokenCount('');
      expect(estimate).toBe(0);
    });
  });

  // =====================================
  // validatePromptContext Tests
  // =====================================
  describe('validatePromptContext', () => {
    it('should return valid for context with rawIdea', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
      };

      const result = validatePromptContext(context);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid for empty rawIdea', () => {
      const context: PromptContext = {
        rawIdea: '',
      };

      const result = validatePromptContext(context);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('rawIdea');
    });

    it('should return invalid for whitespace-only rawIdea', () => {
      const context: PromptContext = {
        rawIdea: '   ',
      };

      const result = validatePromptContext(context);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('rawIdea');
    });

    it('should accept context with optional fields', () => {
      const context: PromptContext = {
        rawIdea: 'Test idea',
        goal: 'Test goal',
        profile: null,
        project: null,
        platform: null,
      };

      const result = validatePromptContext(context);

      expect(result.valid).toBe(true);
    });
  });
});
