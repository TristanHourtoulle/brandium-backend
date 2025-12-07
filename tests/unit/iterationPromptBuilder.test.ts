/**
 * IterationPromptBuilder Unit Tests
 *
 * Tests for specialized iteration prompt generation
 */

import {
  buildSpecializedIterationPrompt,
  estimateLength,
  extractHook,
  validateIterationPromptParams,
} from '../../src/utils/iterationPromptBuilder';
import { IterationType } from '../../src/types/iteration';

describe('iterationPromptBuilder', () => {
  const samplePost = `This is a bold opening line.

Here's some context about the topic.
It continues with more details.

And here's the conclusion with a call to action.

What do you think? Share your thoughts below!

#linkedin #content #marketing`;

  describe('buildSpecializedIterationPrompt', () => {
    it('should build a "shorter" iteration prompt', () => {
      const prompt = buildSpecializedIterationPrompt('shorter', samplePost);

      expect(prompt).toContain('concise');
      expect(prompt).toContain('characters');
      expect(prompt).toContain('Remove redundant');
      expect(prompt).toContain('essential message');
    });

    it('should build a "stronger_hook" iteration prompt', () => {
      const prompt = buildSpecializedIterationPrompt('stronger_hook', samplePost);

      expect(prompt).toContain('hook');
      expect(prompt).toContain('first 2-3 lines');
      expect(prompt).toContain('attention-grabbing');
      expect(prompt).toContain('This is a bold opening line');
    });

    it('should build a "more_personal" iteration prompt', () => {
      const prompt = buildSpecializedIterationPrompt('more_personal', samplePost);

      expect(prompt).toContain('personal anecdote');
      expect(prompt).toContain('concrete example');
      expect(prompt).toContain('relatable');
      expect(prompt).toContain('specific details');
    });

    it('should build an "add_data" iteration prompt', () => {
      const prompt = buildSpecializedIterationPrompt('add_data', samplePost);

      expect(prompt).toContain('data');
      expect(prompt).toContain('statistics');
      expect(prompt).toContain('metrics');
      expect(prompt).toContain('credibility');
    });

    it('should build a "simplify" iteration prompt', () => {
      const prompt = buildSpecializedIterationPrompt('simplify', samplePost);

      expect(prompt).toContain('Simplify');
      expect(prompt).toContain('accessible');
      expect(prompt).toContain('jargon');
      expect(prompt).toContain('simpler');
    });

    it('should use custom feedback for "custom" type', () => {
      const customFeedback = 'Make it more technical and add code examples';
      const prompt = buildSpecializedIterationPrompt('custom', samplePost, customFeedback);

      expect(prompt).toBe(customFeedback);
    });

    it('should throw error for "custom" type without feedback', () => {
      expect(() => {
        buildSpecializedIterationPrompt('custom', samplePost);
      }).toThrow('customFeedback is required');
    });

    it('should calculate target length for "shorter" type', () => {
      const prompt = buildSpecializedIterationPrompt('shorter', samplePost);
      const currentLength = samplePost.length;
      const targetLength = Math.floor(currentLength * 0.7);

      expect(prompt).toContain(`~${targetLength} characters`);
      expect(prompt).toContain(`currently ${currentLength}`);
    });
  });

  describe('estimateLength', () => {
    it('should return correct character count', () => {
      expect(estimateLength('Hello')).toBe(5);
      expect(estimateLength('Hello World')).toBe(11);
      expect(estimateLength('')).toBe(0);
    });
  });

  describe('extractHook', () => {
    it('should extract first 3 lines from a post', () => {
      const hook = extractHook(samplePost);
      const lines = hook.split('\n');

      expect(lines.length).toBeLessThanOrEqual(3);
      expect(hook).toContain('This is a bold opening line');
    });

    it('should handle posts with less than 3 lines', () => {
      const shortPost = 'Line 1\nLine 2';
      const hook = extractHook(shortPost);

      expect(hook).toBe('Line 1\nLine 2');
    });

    it('should filter out empty lines', () => {
      const postWithEmptyLines = 'Line 1\n\n\nLine 2\n\nLine 3\nLine 4';
      const hook = extractHook(postWithEmptyLines);
      const lines = hook.split('\n');

      expect(lines.length).toBe(3);
      expect(hook).not.toContain('\n\n');
    });
  });

  describe('validateIterationPromptParams', () => {
    it('should validate correct parameters', () => {
      const result = validateIterationPromptParams('shorter', samplePost);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty previousText', () => {
      const result = validateIterationPromptParams('shorter', '');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('previousText is required');
    });

    it('should reject custom type without feedback', () => {
      const result = validateIterationPromptParams('custom', samplePost);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('customFeedback is required');
    });

    it('should accept custom type with feedback', () => {
      const result = validateIterationPromptParams('custom', samplePost, 'Add more examples');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Prompt Quality', () => {
    it('all prompts should preserve context and be surgical', () => {
      const types: IterationType[] = ['shorter', 'stronger_hook', 'more_personal', 'add_data', 'simplify'];

      types.forEach(type => {
        const prompt = buildSpecializedIterationPrompt(type, samplePost);

        // All prompts should emphasize minimal changes
        expect(prompt.toLowerCase()).toMatch(/keep|preserve|maintain|exactly|do not change/i);
      });
    });

    it('stronger_hook prompt should include current hook for reference', () => {
      const prompt = buildSpecializedIterationPrompt('stronger_hook', samplePost);

      expect(prompt).toContain('Current hook:');
      expect(prompt).toContain('This is a bold opening line');
    });

    it('shorter prompt should include specific length targets', () => {
      const prompt = buildSpecializedIterationPrompt('shorter', samplePost);

      expect(prompt).toMatch(/\d+\s*characters/i);
      expect(prompt).toContain('currently');
      expect(prompt).toContain('Target:');
    });
  });
});
