/**
 * VariantGenerationService Unit Tests
 */

import { VariantGenerationService } from '../../src/services/VariantGenerationService';
import { llmService } from '../../src/services/LLMService';

// Mock LLMService
jest.mock('../../src/services/LLMService', () => ({
  llmService: {
    generate: jest.fn(),
  },
}));

const mockGenerate = llmService.generate as jest.Mock;

describe('VariantGenerationService', () => {
  let service: VariantGenerationService;

  beforeEach(() => {
    service = new VariantGenerationService();
    mockGenerate.mockReset();
  });

  describe('generateVariants', () => {
    it('should generate 2 variants with different approaches', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Direct approach post',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Storytelling approach post',
          usage: { promptTokens: 110, completionTokens: 60, totalTokens: 170 },
        });

      const variants = await service.generateVariants(
        {
          rawIdea: 'Talk about innovation',
          goal: 'Inspire',
        },
        2,
      );

      expect(variants).toHaveLength(2);
      expect(variants[0]?.approach).toBe('direct');
      expect(variants[1]?.approach).toBe('storytelling');
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it('should generate 3 variants with unique approaches', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Variant 1',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 2',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Variant 3',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const variants = await service.generateVariants(
        {
          rawIdea: 'Discuss remote work',
        },
        3,
      );

      expect(variants).toHaveLength(3);
      expect(variants[0]?.approach).toBe('direct');
      expect(variants[1]?.approach).toBe('storytelling');
      expect(variants[2]?.approach).toBe('data-driven');
    });

    it('should generate 4 variants (maximum)', async () => {
      mockGenerate
        .mockResolvedValueOnce({ text: 'V1', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } })
        .mockResolvedValueOnce({ text: 'V2', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } })
        .mockResolvedValueOnce({ text: 'V3', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } })
        .mockResolvedValueOnce({ text: 'V4', usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 } });

      const variants = await service.generateVariants(
        {
          rawIdea: 'Career tips',
        },
        4,
      );

      expect(variants).toHaveLength(4);
      expect(variants[0]?.approach).toBe('direct');
      expect(variants[1]?.approach).toBe('storytelling');
      expect(variants[2]?.approach).toBe('data-driven');
      expect(variants[3]?.approach).toBe('emotional');
    });

    it('should use different temperatures for different approaches', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'Direct',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'Storytelling',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      await service.generateVariants(
        {
          rawIdea: 'Test',
        },
        2,
      );

      // Check that different temperatures were used
      const firstCall = mockGenerate.mock.calls[0][0];
      const secondCall = mockGenerate.mock.calls[1][0];

      expect(firstCall.temperature).toBe(0.5); // Direct approach
      expect(secondCall.temperature).toBe(0.7); // Storytelling approach
    });

    it('should include profile context in prompts', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Post with profile',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateVariants(
        {
          rawIdea: 'Test idea',
          profile: {
            name: 'John Doe',
            bio: 'Tech leader',
            toneTags: ['professional'],
          } as any,
        },
        1,
      );

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('John Doe');
      expect(callArgs.prompt).toContain('Tech leader');
    });

    it('should detect post format for all variants', async () => {
      mockGenerate.mockResolvedValue({
        text: 'Test variant',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const variants = await service.generateVariants(
        {
          rawIdea: 'What do you think about AI replacing jobs?',
          goal: 'Start a debate',
        },
        2,
      );

      expect(variants[0]?.format).toBeDefined();
      expect(variants[1]?.format).toBeDefined();
      // Same format should be detected for all variants
      expect(variants[0]?.format).toEqual(variants[1]?.format);
    });

    it('should generate variants in parallel', async () => {
      const start = Date.now();

      mockGenerate
        .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({
          text: 'Variant',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        }), 100)))
        .mockResolvedValueOnce({
          text: 'V1',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'V2',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'V3',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      await service.generateVariants(
        {
          rawIdea: 'Test',
        },
        3,
      );

      const duration = Date.now() - start;

      // If run in parallel, should complete much faster than sequential (3 * 100ms = 300ms)
      // With parallel execution, should be close to 100ms
      expect(duration).toBeLessThan(250); // Allow some margin
    });

    it('should include version numbers for each variant', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'V1',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'V2',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'V3',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        });

      const variants = await service.generateVariants(
        {
          rawIdea: 'Test',
        },
        3,
      );

      expect(variants[0]?.version).toBe(1);
      expect(variants[1]?.version).toBe(2);
      expect(variants[2]?.version).toBe(3);
    });

    it('should include usage data for each variant', async () => {
      mockGenerate
        .mockResolvedValueOnce({
          text: 'V1',
          usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        })
        .mockResolvedValueOnce({
          text: 'V2',
          usage: { promptTokens: 120, completionTokens: 60, totalTokens: 180 },
        });

      const variants = await service.generateVariants(
        {
          rawIdea: 'Test',
        },
        2,
      );

      expect(variants[0]?.usage).toEqual({ promptTokens: 100, completionTokens: 50, totalTokens: 150 });
      expect(variants[1]?.usage).toEqual({ promptTokens: 120, completionTokens: 60, totalTokens: 180 });
    });

    it('should add approach-specific instructions to prompts', async () => {
      mockGenerate.mockResolvedValueOnce({
        text: 'Direct variant',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await service.generateVariants(
        {
          rawIdea: 'Test',
        },
        1,
      );

      const callArgs = mockGenerate.mock.calls[0][0];
      expect(callArgs.prompt).toContain('APPROACH GUIDANCE');
      expect(callArgs.prompt).toContain('direct');
    });
  });
});
