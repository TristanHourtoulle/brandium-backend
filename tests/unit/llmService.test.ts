/**
 * LLM Service Unit Tests
 *
 * Comprehensive tests for LLMService including:
 * - Rate limiting logic
 * - Error handling
 * - OpenAI API integration (with injected mock client)
 */

import {
  RateLimitError,
  LLMServiceError,
  LLMService,
  OpenAIClient,
  llmService,
} from '../../src/services/LLMService';
import OpenAI from 'openai';

/**
 * Create a mock Headers object for OpenAI.APIError
 */
function createMockHeaders(): Headers {
  const headers = new Map<string, string>();
  return {
    get: (name: string) => headers.get(name.toLowerCase()) || null,
    has: (name: string) => headers.has(name.toLowerCase()),
    set: (name: string, value: string) => headers.set(name.toLowerCase(), value),
    delete: (name: string) => headers.delete(name.toLowerCase()),
    append: () => {},
    entries: () => headers.entries(),
    keys: () => headers.keys(),
    values: () => headers.values(),
    forEach: (callback: (value: string, key: string) => void) => headers.forEach(callback),
    getSetCookie: () => [],
    [Symbol.iterator]: () => headers.entries(),
  } as unknown as Headers;
}

/**
 * Create a mock OpenAI client for testing
 */
function createMockClient(
  mockResponse?: {
    choices: Array<{ message: { content: string | null } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  },
  shouldReject?: Error,
): OpenAIClient {
  const create = jest.fn();

  if (shouldReject) {
    create.mockRejectedValue(shouldReject);
  } else if (mockResponse) {
    create.mockResolvedValue(mockResponse);
  } else {
    // Default successful response
    create.mockResolvedValue({
      choices: [{ message: { content: 'Generated content' } }],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });
  }

  return {
    chat: {
      completions: {
        create,
      },
    },
  };
}

describe('LLMService', () => {
  // Tests for the singleton instance
  describe('Singleton llmService', () => {
    beforeEach(() => {
      llmService.resetRateLimits();
      llmService.setRateLimitConfig({
        maxRequestsPerMinute: 20,
        maxTokensPerMinute: 40000,
      });
    });

    describe('getRateLimitStatus', () => {
      it('should return full limits when no requests made', () => {
        llmService.setRateLimitConfig({
          maxRequestsPerMinute: 20,
          maxTokensPerMinute: 40000,
        });
        llmService.resetRateLimits();

        const status = llmService.getRateLimitStatus();

        expect(status.requestsRemaining).toBe(20);
        expect(status.tokensRemaining).toBe(40000);
      });

      it('should include windowResetIn in status', () => {
        const status = llmService.getRateLimitStatus();
        expect(status).toHaveProperty('windowResetIn');
        expect(typeof status.windowResetIn).toBe('number');
      });

      it('should return correct windowResetIn after reset', () => {
        llmService.resetRateLimits();
        const status = llmService.getRateLimitStatus();
        expect(status.windowResetIn).toBeGreaterThanOrEqual(0);
        expect(status.windowResetIn).toBeLessThanOrEqual(60);
      });
    });

    describe('setRateLimitConfig', () => {
      it('should update rate limit configuration', () => {
        llmService.setRateLimitConfig({
          maxRequestsPerMinute: 10,
          maxTokensPerMinute: 20000,
        });
        llmService.resetRateLimits();

        const status = llmService.getRateLimitStatus();

        expect(status.requestsRemaining).toBe(10);
        expect(status.tokensRemaining).toBe(20000);
      });

      it('should allow partial config updates', () => {
        llmService.setRateLimitConfig({
          maxRequestsPerMinute: 5,
        });
        llmService.resetRateLimits();

        const status = llmService.getRateLimitStatus();
        expect(status.requestsRemaining).toBe(5);
      });
    });

    describe('resetRateLimits', () => {
      it('should reset all counters to initial values', () => {
        llmService.setRateLimitConfig({
          maxRequestsPerMinute: 20,
          maxTokensPerMinute: 40000,
        });

        llmService.resetRateLimits();
        const statusBefore = llmService.getRateLimitStatus();

        llmService.resetRateLimits();
        const statusAfter = llmService.getRateLimitStatus();

        expect(statusBefore.requestsRemaining).toBe(statusAfter.requestsRemaining);
        expect(statusBefore.tokensRemaining).toBe(statusAfter.tokensRemaining);
      });
    });
  });

  // Tests using injected client for full coverage
  describe('LLMService with injected client', () => {
    describe('generate() - Success Cases', () => {
      it('should generate content successfully', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: 'Generated post content!' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        });
        const service = new LLMService(mockClient);

        const result = await service.generate({ prompt: 'Test prompt' });

        expect(result.text).toBe('Generated post content!');
        expect(result.usage.promptTokens).toBe(100);
        expect(result.usage.completionTokens).toBe(50);
        expect(result.usage.totalTokens).toBe(150);
      });

      it('should use custom maxTokens and temperature', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);

        await service.generate({
          prompt: 'Test',
          maxTokens: 500,
          temperature: 0.5,
        });

        expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens: 500,
            temperature: 0.5,
          }),
        );
      });

      it('should use default values when not provided', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);

        await service.generate({ prompt: 'Test' });

        expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            max_tokens: expect.any(Number),
            temperature: expect.any(Number),
          }),
        );
      });

      it('should include system and user messages', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);

        await service.generate({ prompt: 'My test prompt' });

        expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            messages: expect.arrayContaining([
              expect.objectContaining({ role: 'system' }),
              expect.objectContaining({ role: 'user', content: 'My test prompt' }),
            ]),
          }),
        );
      });

      it('should handle missing usage data gracefully', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: 'Response without usage' } }],
          usage: undefined,
        });
        const service = new LLMService(mockClient);

        const result = await service.generate({ prompt: 'Test' });

        expect(result.text).toBe('Response without usage');
        expect(result.usage.promptTokens).toBe(0);
        expect(result.usage.completionTokens).toBe(0);
        expect(result.usage.totalTokens).toBe(0);
      });

      it('should trim whitespace from response', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: '  Content with whitespace  ' } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });
        const service = new LLMService(mockClient);

        const result = await service.generate({ prompt: 'Test' });

        expect(result.text).toBe('Content with whitespace');
      });
    });

    describe('generate() - Rate Limiting', () => {
      it('should update rate limit counters after successful generation', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: 'Generated' } }],
          usage: { prompt_tokens: 50, completion_tokens: 50, total_tokens: 100 },
        });
        const service = new LLMService(mockClient);
        service.setRateLimitConfig({ maxRequestsPerMinute: 10, maxTokensPerMinute: 1000 });

        const before = service.getRateLimitStatus();
        await service.generate({ prompt: 'Test' });
        const after = service.getRateLimitStatus();

        expect(after.requestsRemaining).toBe(before.requestsRemaining - 1);
        expect(after.tokensRemaining).toBe(before.tokensRemaining - 100);
      });

      it('should throw RateLimitError when request limit exceeded', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);
        service.setRateLimitConfig({ maxRequestsPerMinute: 1, maxTokensPerMinute: 10000 });

        // First request succeeds
        await service.generate({ prompt: 'First' });

        // Second request should fail
        await expect(service.generate({ prompt: 'Second' })).rejects.toThrow(RateLimitError);
      });

      it('should throw RateLimitError when token limit exceeded', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: 'Generated' } }],
          usage: { prompt_tokens: 500, completion_tokens: 500, total_tokens: 1000 },
        });
        const service = new LLMService(mockClient);
        service.setRateLimitConfig({ maxRequestsPerMinute: 100, maxTokensPerMinute: 500 });

        // First request uses 1000 tokens, exceeding limit
        await service.generate({ prompt: 'First' });

        // Second request should fail
        await expect(service.generate({ prompt: 'Second' })).rejects.toThrow(RateLimitError);
      });

      it('should include retryAfter in RateLimitError', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);
        service.setRateLimitConfig({ maxRequestsPerMinute: 1, maxTokensPerMinute: 10000 });

        await service.generate({ prompt: 'First' });

        try {
          await service.generate({ prompt: 'Second' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitError);
          expect((error as RateLimitError).retryAfter).toBeGreaterThan(0);
          expect((error as RateLimitError).retryAfter).toBeLessThanOrEqual(60);
        }
      });

      it('should reset counters after window expires', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);
        service.setRateLimitConfig({ maxRequestsPerMinute: 10, maxTokensPerMinute: 10000 });

        // Generate to use some limits
        await service.generate({ prompt: 'Test' });

        // Reset simulates window expiration
        service.resetRateLimits();

        const status = service.getRateLimitStatus();
        expect(status.requestsRemaining).toBe(10);
      });

      it('should auto-reset rate limit window after 60 seconds during checkRateLimit', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);
        service.setRateLimitConfig({ maxRequestsPerMinute: 1, maxTokensPerMinute: 10000 });

        // Use the rate limit
        await service.generate({ prompt: 'First' });

        // Mock Date.now to be 61 seconds later
        const originalNow = Date.now;
        const startTime = originalNow();
        jest.spyOn(Date, 'now').mockReturnValue(startTime + 61000);

        // This should succeed because window has expired
        await service.generate({ prompt: 'After window expired' });

        // Restore Date.now
        jest.spyOn(Date, 'now').mockRestore();
      });

      it('should return full limits with windowResetIn=0 when window expired in getRateLimitStatus', async () => {
        const mockClient = createMockClient();
        const service = new LLMService(mockClient);
        service.setRateLimitConfig({ maxRequestsPerMinute: 10, maxTokensPerMinute: 10000 });

        // Use some rate limit
        await service.generate({ prompt: 'Test' });

        // Mock Date.now to be 61 seconds later
        const originalNow = Date.now;
        const startTime = originalNow();
        jest.spyOn(Date, 'now').mockReturnValue(startTime + 61000);

        const status = service.getRateLimitStatus();

        // Should return full limits because window expired
        expect(status.requestsRemaining).toBe(10);
        expect(status.tokensRemaining).toBe(10000);
        expect(status.windowResetIn).toBe(0);

        // Restore Date.now
        jest.spyOn(Date, 'now').mockRestore();
      });
    });

    describe('generate() - Error Handling', () => {
      it('should throw EMPTY_RESPONSE when content is empty string', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: '' } }],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        });
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).code).toBe('EMPTY_RESPONSE');
        }
      });

      it('should throw EMPTY_RESPONSE when content is null', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: null } }],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        });
        const service = new LLMService(mockClient);

        await expect(service.generate({ prompt: 'Test' })).rejects.toThrow(LLMServiceError);
      });

      it('should throw EMPTY_RESPONSE when content is whitespace only', async () => {
        const mockClient = createMockClient({
          choices: [{ message: { content: '   ' } }],
          usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
        });
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect((error as LLMServiceError).code).toBe('EMPTY_RESPONSE');
        }
      });

      it('should re-throw RateLimitError unchanged', async () => {
        const rateLimitError = new RateLimitError('Test rate limit', 30);
        const mockClient = createMockClient(undefined, rateLimitError);
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(RateLimitError);
          expect((error as RateLimitError).retryAfter).toBe(30);
        }
      });

      it('should re-throw LLMServiceError unchanged', async () => {
        const serviceError = new LLMServiceError('Test error', 'CUSTOM_CODE');
        const mockClient = createMockClient(undefined, serviceError);
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).code).toBe('CUSTOM_CODE');
        }
      });

      it('should handle OpenAI 429 rate limit error', async () => {
        const apiError = new OpenAI.APIError(
          429,
          { message: 'Rate limited' },
          'Rate limited',
          createMockHeaders(),
        );
        const mockClient = createMockClient(undefined, apiError);
        const service = new LLMService(mockClient);

        await expect(service.generate({ prompt: 'Test' })).rejects.toThrow(RateLimitError);
      });

      it('should handle OpenAI 401 unauthorized error', async () => {
        const apiError = new OpenAI.APIError(
          401,
          { message: 'Invalid key' },
          'Invalid key',
          createMockHeaders(),
        );
        const mockClient = createMockClient(undefined, apiError);
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).code).toBe('INVALID_API_KEY');
        }
      });

      it('should handle OpenAI 503 service unavailable error', async () => {
        const apiError = new OpenAI.APIError(
          503,
          { message: 'Service unavailable' },
          'Service unavailable',
          createMockHeaders(),
        );
        const mockClient = createMockClient(undefined, apiError);
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).code).toBe('SERVICE_UNAVAILABLE');
        }
      });

      it('should handle other OpenAI API errors', async () => {
        const apiError = new OpenAI.APIError(
          500,
          { message: 'Server error' },
          'Server error',
          createMockHeaders(),
        );
        const mockClient = createMockClient(undefined, apiError);
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).code).toBe('API_ERROR');
        }
      });

      it('should handle unknown Error objects', async () => {
        const unknownError = new Error('Something went wrong');
        const mockClient = createMockClient(undefined, unknownError);
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).code).toBe('GENERATION_FAILED');
          expect((error as LLMServiceError).message).toContain('Something went wrong');
        }
      });

      it('should handle non-Error thrown values', async () => {
        const mockClient: OpenAIClient = {
          chat: {
            completions: {
              create: jest.fn().mockRejectedValue('string error'),
            },
          },
        };
        const service = new LLMService(mockClient);

        try {
          await service.generate({ prompt: 'Test' });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).message).toContain('Unknown error');
        }
      });
    });

    describe('API key validation', () => {
      it('should throw API_KEY_MISSING when no API key and no injected client', () => {
        const originalKey = process.env.OPENAI_API_KEY;
        delete process.env.OPENAI_API_KEY;

        const service = new LLMService();

        expect(service.generate({ prompt: 'Test' })).rejects.toMatchObject({
          code: 'API_KEY_MISSING',
        });

        process.env.OPENAI_API_KEY = originalKey;
      });
    });
  });

  // Custom Error Classes Tests
  describe('RateLimitError', () => {
    it('should have correct name property', () => {
      const error = new RateLimitError('Rate limit exceeded', 30);
      expect(error.name).toBe('RateLimitError');
    });

    it('should have correct message property', () => {
      const error = new RateLimitError('Rate limit exceeded', 30);
      expect(error.message).toBe('Rate limit exceeded');
    });

    it('should have correct retryAfter property', () => {
      const error = new RateLimitError('Rate limit exceeded', 30);
      expect(error.retryAfter).toBe(30);
    });

    it('should extend Error class', () => {
      const error = new RateLimitError('Test', 10);
      expect(error).toBeInstanceOf(Error);
    });

    it('should work with different retryAfter values', () => {
      const error1 = new RateLimitError('Test', 0);
      const error2 = new RateLimitError('Test', 60);
      const error3 = new RateLimitError('Test', 3600);

      expect(error1.retryAfter).toBe(0);
      expect(error2.retryAfter).toBe(60);
      expect(error3.retryAfter).toBe(3600);
    });
  });

  describe('LLMServiceError', () => {
    it('should have correct name property', () => {
      const error = new LLMServiceError('API key missing', 'API_KEY_MISSING');
      expect(error.name).toBe('LLMServiceError');
    });

    it('should have correct message property', () => {
      const error = new LLMServiceError('API key missing', 'API_KEY_MISSING');
      expect(error.message).toBe('API key missing');
    });

    it('should have correct code property', () => {
      const error = new LLMServiceError('API key missing', 'API_KEY_MISSING');
      expect(error.code).toBe('API_KEY_MISSING');
    });

    it('should have default code when not provided', () => {
      const error = new LLMServiceError('Generic error');
      expect(error.code).toBe('LLM_ERROR');
    });

    it('should extend Error class', () => {
      const error = new LLMServiceError('Test', 'TEST');
      expect(error).toBeInstanceOf(Error);
    });

    it('should work with various error codes', () => {
      const codes = [
        'API_KEY_MISSING',
        'INVALID_API_KEY',
        'SERVICE_UNAVAILABLE',
        'EMPTY_RESPONSE',
        'API_ERROR',
        'GENERATION_FAILED',
      ];

      codes.forEach((code) => {
        const error = new LLMServiceError(`Error: ${code}`, code);
        expect(error.code).toBe(code);
        expect(error.message).toBe(`Error: ${code}`);
      });
    });
  });
});
