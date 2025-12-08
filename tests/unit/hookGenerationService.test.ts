/**
 * HookGenerationService Unit Tests
 */

import { HookGenerationService } from '../../src/services/HookGenerationService';
import { llmService } from '../../src/services/LLMService';

// Mock LLMService
jest.mock('../../src/services/LLMService', () => ({
  llmService: {
    generate: jest.fn(),
  },
}));

const mockGenerate = llmService.generate as jest.Mock;

describe('HookGenerationService', () => {
  let service: HookGenerationService;

  beforeEach(() => {
    service = new HookGenerationService();
    mockGenerate.mockReset();
  });

  describe('generateHooks', () => {
    it('should generate hooks with proper format parsing', async () => {
      const mockResponse = `
[TYPE: question]
[HOOK: Ever wonder why 90% of developers burn out?]
[ENGAGEMENT: 8]
---
[TYPE: stat]
[HOOK: 73% of professionals learn more from failures.]
[ENGAGEMENT: 7]
---
[TYPE: story]
[HOOK: Last Tuesday, I made a mistake that cost me 3 clients...]
[ENGAGEMENT: 9]
---
[TYPE: bold_opinion]
[HOOK: Stop doing daily standups. They're killing productivity.]
[ENGAGEMENT: 8]
---
`;

      mockGenerate.mockResolvedValueOnce({
        text: mockResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const hooks = await service.generateHooks({
        rawIdea: 'Test idea',
        count: 4,
      });

      expect(hooks).toHaveLength(4);
      expect(hooks[0]?.type).toBe('question');
      expect(hooks[1]?.type).toBe('stat');
      expect(hooks[2]?.type).toBe('story');
      expect(hooks[3]?.type).toBe('bold_opinion');
      expect(hooks[0]?.text).toContain('burn out');
      expect(hooks[0]?.estimatedEngagement).toBe(8);
    });

    it('should use fallback hooks if parsing fails', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'This is some unformatted response that cannot be parsed properly.',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const hooks = await service.generateHooks({
        rawIdea: 'Test idea',
        count: 4,
      });

      expect(hooks).toHaveLength(4);
      // Should still return 4 hooks using fallback mechanism
      expect(hooks.every(h => h.type && h.text && h.estimatedEngagement)).toBe(true);
    });

    it('should include profile context in prompt', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: question]\n[HOOK: Test hook]\n[ENGAGEMENT: 7]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooks({
        rawIdea: 'Test idea',
        profile: {
          name: 'John Doe',
          bio: 'Developer',
          toneTags: ['professional', 'friendly'],
        },
        count: 4,
      });

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('John Doe');
      expect(callArgs.prompt).toContain('Developer');
      expect(callArgs.prompt).toContain('professional');
    });

    it('should use correct LLM parameters', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: question]\n[HOOK: Test]\n[ENGAGEMENT: 7]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooks({
        rawIdea: 'Test idea',
      });

      expect(mockGenerate).toHaveBeenCalledWith({
        prompt: expect.any(String),
        maxTokens: 800,
        temperature: 0.8,
      });
    });

    it('should handle fallback with partial valid lines', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Short hook that is 20+ chars\nAnother decent length hook here\nAnd one more for testing',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const hooks = await service.generateHooks({
        rawIdea: 'Test idea',
        count: 4,
      });

      expect(hooks).toHaveLength(4);
      expect(hooks.every(h => h.type && h.text && typeof h.estimatedEngagement === 'number')).toBe(true);
    });

    it('should handle empty response with example fallback', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const hooks = await service.generateHooks({
        rawIdea: 'Test idea',
        count: 4,
      });

      expect(hooks).toHaveLength(4);
      expect(hooks.every(h => h.type && h.text && h.estimatedEngagement)).toBe(true);
    });

    it('should clamp engagement scores to 1-10 range during parsing', async () => {
      const mockResponse = `
[TYPE: question]
[HOOK: Test hook?]
[ENGAGEMENT: 15]
---
[TYPE: stat]
[HOOK: 73% of professionals succeed]
[ENGAGEMENT: 8]
---
[TYPE: story]
[HOOK: Story hook]
[ENGAGEMENT: 5]
---
[TYPE: bold_opinion]
[HOOK: Opinion hook!]
[ENGAGEMENT: 3]
---
`;

      mockGenerate.mockResolvedValueOnce({
        text: mockResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const hooks = await service.generateHooks({
        rawIdea: 'Test idea',
        count: 4,
      });

      // All engagement scores should be within valid 1-10 range
      expect(hooks).toHaveLength(4);
      hooks.forEach(hook => {
        expect(hook.estimatedEngagement).toBeGreaterThanOrEqual(1);
        expect(hook.estimatedEngagement).toBeLessThanOrEqual(10);
      });

      // Verify clamping works on high values
      expect(hooks[0]?.estimatedEngagement).toBe(10); // Clamped from 15
    });

    it('should handle multiline hook text', async () => {
      const mockResponse = `
[TYPE: story]
[HOOK: Last year, I made a mistake. It cost me everything. But I learned something valuable.]
[ENGAGEMENT: 9]
---
`;

      mockGenerate.mockResolvedValueOnce({
        text: mockResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const hooks = await service.generateHooks({
        rawIdea: 'Test idea',
        count: 1,
      });

      expect(hooks[0]?.text).toContain('Last year');
      expect(hooks[0]?.text).toContain('learned something valuable');
    });

    it('should generate prompt with goal when provided', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: question]\n[HOOK: Test]\n[ENGAGEMENT: 7]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooks({
        rawIdea: 'Test idea',
        goal: 'Educate and inspire',
        count: 4,
      });

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Educate and inspire');
    });

    it('should handle response with missing engagement scores', async () => {
      const mockResponse = `
[TYPE: question]
[HOOK: Test hook without engagement]
---
[TYPE: stat]
[HOOK: Another hook]
[ENGAGEMENT: 7]
---
`;

      mockGenerate.mockResolvedValueOnce({
        text: mockResponse,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const hooks = await service.generateHooks({
        rawIdea: 'Test idea',
        count: 4,
      });

      // Should only return valid hooks (first one missing engagement is skipped)
      expect(hooks).toHaveLength(1);
      expect(hooks[0]?.type).toBe('stat');
      expect(hooks[0]?.estimatedEngagement).toBe(7);
    });
  });

  describe('generateHooksFromPost', () => {
    it('should generate hooks from post content', async () => {
      const mockResponse = `
[TYPE: story]
[HOOK: 2 years ago, I lost 50K€ in 6 months...]
[ENGAGEMENT: 9]
---
[TYPE: stat]
[HOOK: 78% of founders make these 3 mistakes.]
[ENGAGEMENT: 8]
---
[TYPE: story]
[HOOK: My first hire was a disaster...]
[ENGAGEMENT: 8]
---
[TYPE: bold_opinion]
[HOOK: Stop listening to business advice.]
[ENGAGEMENT: 9]
---
[TYPE: question]
[HOOK: Are you making these 3 mistakes?]
[ENGAGEMENT: 7]
---
[TYPE: bold_opinion]
[HOOK: Stop glorifying failure.]
[ENGAGEMENT: 8]
---
`;

      mockGenerate.mockResolvedValueOnce({
        text: mockResponse,
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      });

      const hooks = await service.generateHooksFromPost({
        postContent: 'The 3 mistakes that cost me 50K€ as a founder...',
        variants: 2,
      });

      expect(hooks).toHaveLength(6);
      // Should be sorted by engagement (highest first)
      expect(hooks[0]?.estimatedEngagement).toBeGreaterThanOrEqual(hooks[1]?.estimatedEngagement || 0);
      expect(hooks[0]?.estimatedEngagement).toBe(9);
    });

    it('should use correct LLM parameters for post-based generation', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: story]\n[HOOK: Test]\n[ENGAGEMENT: 8]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooksFromPost({
        postContent: 'Test post content',
        variants: 2,
      });

      expect(mockGenerate).toHaveBeenCalledWith({
        prompt: expect.any(String),
        maxTokens: 1200,
        temperature: 0.85,
      });
    });

    it('should include post content in prompt', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: question]\n[HOOK: Test]\n[ENGAGEMENT: 7]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooksFromPost({
        postContent: 'My unique post content here',
        variants: 2,
      });

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('My unique post content here');
    });

    it('should include profile context in post-based prompt', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: story]\n[HOOK: Test]\n[ENGAGEMENT: 8]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooksFromPost({
        postContent: 'Test post',
        profile: {
          name: 'Jane Smith',
          bio: 'Entrepreneur',
          toneTags: ['inspiring', 'authentic'],
        },
        variants: 2,
      });

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Jane Smith');
      expect(callArgs.prompt).toContain('Entrepreneur');
      expect(callArgs.prompt).toContain('inspiring');
    });

    it('should handle goal in post-based generation', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: question]\n[HOOK: Test]\n[ENGAGEMENT: 7]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooksFromPost({
        postContent: 'Test post',
        goal: 'Drive engagement',
        variants: 2,
      });

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Drive engagement');
    });

    it('should use default variants value of 2', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: story]\n[HOOK: Test]\n[ENGAGEMENT: 8]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooksFromPost({
        postContent: 'Test post',
      });

      const callArgs = mockGenerate.mock.calls[0][0];
      // Prompt should mention 2 variants (default)
      expect(callArgs.prompt).toContain('2 variants');
    });

    it('should respect custom variants parameter', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: '[TYPE: story]\n[HOOK: Test]\n[ENGAGEMENT: 8]\n---',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateHooksFromPost({
        postContent: 'Test post',
        variants: 3,
      });

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('3 variants');
    });
  });
});
