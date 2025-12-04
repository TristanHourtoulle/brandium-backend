import OpenAI from 'openai';
import { OPENAI } from '../config/constants';

/**
 * Rate limiter configuration
 */
interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
}

/**
 * Rate limiter state
 */
interface RateLimitState {
  requestCount: number;
  tokenCount: number;
  windowStart: number;
}

/**
 * Generation request parameters
 */
export interface GenerateParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Generation response
 */
export interface GenerateResponse {
  text: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Custom error for rate limiting
 */
export class RateLimitError extends Error {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Custom error for LLM service
 */
export class LLMServiceError extends Error {
  public readonly code: string;

  constructor(message: string, code: string = 'LLM_ERROR') {
    super(message);
    this.name = 'LLMServiceError';
    this.code = code;
  }
}

/**
 * Interface for OpenAI-compatible client (for testing)
 */
export interface OpenAIClient {
  chat: {
    completions: {
      create: (params: unknown) => Promise<{
        choices: Array<{ message: { content: string | null } }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      }>;
    };
  };
}

/**
 * LLM Service for OpenAI API integration
 * Includes rate limiting to prevent over-usage
 */
export class LLMService {
  private client: OpenAI | OpenAIClient | null = null;
  private model: string;
  private rateLimitConfig: RateLimitConfig;
  private rateLimitState: RateLimitState;

  constructor(injectedClient?: OpenAIClient) {
    this.model = process.env.OPENAI_MODEL || OPENAI.DEFAULT_MODEL;
    this.rateLimitConfig = {
      maxRequestsPerMinute: parseInt(process.env.OPENAI_MAX_REQUESTS_PER_MINUTE || '20', 10),
      maxTokensPerMinute: parseInt(process.env.OPENAI_MAX_TOKENS_PER_MINUTE || '40000', 10),
    };
    this.rateLimitState = {
      requestCount: 0,
      tokenCount: 0,
      windowStart: Date.now(),
    };
    // Allow client injection for testing
    if (injectedClient) {
      this.client = injectedClient;
    }
  }

  /**
   * Initialize OpenAI client lazily
   */
  private getClient(): OpenAI | OpenAIClient {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new LLMServiceError('OPENAI_API_KEY is not configured', 'API_KEY_MISSING');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Check and update rate limit state
   * Resets counters if window has passed
   */
  private checkRateLimit(): void {
    const now = Date.now();
    const windowDuration = 60 * 1000; // 1 minute in ms

    // Reset window if expired
    if (now - this.rateLimitState.windowStart >= windowDuration) {
      this.rateLimitState = {
        requestCount: 0,
        tokenCount: 0,
        windowStart: now,
      };
    }

    // Check request limit
    if (this.rateLimitState.requestCount >= this.rateLimitConfig.maxRequestsPerMinute) {
      const retryAfter = Math.ceil(
        (windowDuration - (now - this.rateLimitState.windowStart)) / 1000,
      );
      throw new RateLimitError(
        `Rate limit exceeded: ${this.rateLimitConfig.maxRequestsPerMinute} requests per minute`,
        retryAfter,
      );
    }

    // Check token limit
    if (this.rateLimitState.tokenCount >= this.rateLimitConfig.maxTokensPerMinute) {
      const retryAfter = Math.ceil(
        (windowDuration - (now - this.rateLimitState.windowStart)) / 1000,
      );
      throw new RateLimitError(
        `Rate limit exceeded: ${this.rateLimitConfig.maxTokensPerMinute} tokens per minute`,
        retryAfter,
      );
    }
  }

  /**
   * Update rate limit counters after a successful request
   */
  private updateRateLimitCounters(tokensUsed: number): void {
    this.rateLimitState.requestCount++;
    this.rateLimitState.tokenCount += tokensUsed;
  }

  /**
   * Generate text using OpenAI
   */
  async generate(params: GenerateParams): Promise<GenerateResponse> {
    // Check rate limits before making request
    this.checkRateLimit();

    const client = this.getClient();
    const maxTokens = params.maxTokens || OPENAI.DEFAULT_MAX_TOKENS;
    const temperature = params.temperature ?? OPENAI.DEFAULT_TEMPERATURE;

    try {
      const response = await client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert social media content creator specialized in personal branding. ' +
              'You create engaging, authentic posts that resonate with the target audience while ' +
              'maintaining the user\'s unique voice and style.',
          },
          {
            role: 'user',
            content: params.prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature,
      });

      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      // Update rate limit counters
      this.updateRateLimitCounters(usage.totalTokens);

      const text = response.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new LLMServiceError('No content generated', 'EMPTY_RESPONSE');
      }

      return { text, usage };
    } catch (error) {
      // Re-throw our custom errors
      if (error instanceof RateLimitError || error instanceof LLMServiceError) {
        throw error;
      }

      // Handle OpenAI specific errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          throw new RateLimitError('OpenAI rate limit exceeded', 60);
        }
        if (error.status === 401) {
          throw new LLMServiceError('Invalid OpenAI API key', 'INVALID_API_KEY');
        }
        if (error.status === 503) {
          throw new LLMServiceError('OpenAI service unavailable', 'SERVICE_UNAVAILABLE');
        }
        throw new LLMServiceError(`OpenAI API error: ${error.message}`, 'API_ERROR');
      }

      // Handle unknown errors
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new LLMServiceError(`Failed to generate content: ${message}`, 'GENERATION_FAILED');
    }
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): {
    requestsRemaining: number;
    tokensRemaining: number;
    windowResetIn: number;
  } {
    const now = Date.now();
    const windowDuration = 60 * 1000;
    const elapsed = now - this.rateLimitState.windowStart;

    // Check if window has expired
    if (elapsed >= windowDuration) {
      return {
        requestsRemaining: this.rateLimitConfig.maxRequestsPerMinute,
        tokensRemaining: this.rateLimitConfig.maxTokensPerMinute,
        windowResetIn: 0,
      };
    }

    return {
      requestsRemaining: Math.max(
        0,
        this.rateLimitConfig.maxRequestsPerMinute - this.rateLimitState.requestCount,
      ),
      tokensRemaining: Math.max(
        0,
        this.rateLimitConfig.maxTokensPerMinute - this.rateLimitState.tokenCount,
      ),
      windowResetIn: Math.ceil((windowDuration - elapsed) / 1000),
    };
  }

  /**
   * Reset rate limit state (useful for testing)
   */
  resetRateLimits(): void {
    this.rateLimitState = {
      requestCount: 0,
      tokenCount: 0,
      windowStart: Date.now(),
    };
  }

  /**
   * Set custom rate limit config (useful for testing)
   */
  setRateLimitConfig(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = {
      ...this.rateLimitConfig,
      ...config,
    };
  }
}

// Export singleton instance
export const llmService = new LLMService();
export default llmService;
