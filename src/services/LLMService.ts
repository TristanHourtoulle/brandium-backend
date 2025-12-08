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
            content: `You are an elite LinkedIn ghostwriter specializing in viral personal branding content.
Your mission: produce a post the author can publish WITHOUT ANY modification.

═══════════════════════════════════════════════════════════════
                    STEP 1: SELECT YOUR FORMAT
═══════════════════════════════════════════════════════════════

Analyze the goal and raw idea, then choose ONE format:

┌─────────────────────────────────────────────────────────────┐
│ FORMAT 1: STORY (Modèle Histoire)                           │
├─────────────────────────────────────────────────────────────┤
│ USE WHEN: sharing experience, lesson learned, failure,      │
│ journey, transformation, behind-the-scenes                  │
│                                                             │
│ STRUCTURE (follow this order):                              │
│ 1. CONTEXT (2-3 lines) → Set the scene fast, be specific    │
│    "Il y a 6 mois, j'ai tout plaqué pour..."                │
│ 2. PROBLEM/TENSION (3-4 lines) → The conflict, what broke   │
│    "Le problème ? Personne n'achetait."                     │
│ 3. LESSON (4-6 lines) → The insight, transformation         │
│    "J'ai compris que..." / "Ce que j'aurais dû faire..."    │
│ 4. QUESTION (1 line) → Engage on their experience           │
│    "Et toi, quelle erreur t'a le plus appris ?"             │
│                                                             │
│ TONE: Vulnerable, authentic, conversational                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FORMAT 2: CONTRARIAN OPINION (Chercher une opinion)         │
├─────────────────────────────────────────────────────────────┤
│ USE WHEN: challenging beliefs, unpopular opinion, hot take, │
│ going against common advice, myth-busting                   │
│                                                             │
│ STRUCTURE (follow this order):                              │
│ 1. HOOK LINE (1-2 lines) → Bold statement, pattern interrupt│
│    "Arrêtez de [common advice]. Ça ne marche pas."          │
│    "Unpopular opinion: [controversial take]"                │
│ 2. ARGUMENTATION (2-3 short paragraphs) → Explain WHY       │
│    Technical/logical reasoning, break it down               │
│ 3. PERSONAL PROOF (2-3 lines) → Your concrete case          │
│    "Dans mon cas..." / "J'ai testé et..."                   │
│ 4. VALIDATION (1 line) → Ask if they agree/disagree         │
│    "Tu es d'accord ou je suis complètement à côté ?"        │
│                                                             │
│ TONE: Confident, provocative but respectful, data-driven    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ FORMAT 3: DEBATE (Susciter un débat)                        │
├─────────────────────────────────────────────────────────────┤
│ USE WHEN: gathering opinions, sparking discussion,          │
│ exploring a topic with multiple valid viewpoints            │
│                                                             │
│ STRUCTURE (follow this order):                              │
│ 1. POSITION (2-3 lines) → State your opinion clearly        │
│    "Je pense que [opinion]. Voici pourquoi."                │
│ 2. REASONING (3-4 lines) → Your personal perspective        │
│    Why you believe this, what shaped your view              │
│ 3. EVIDENCE (2-3 lines) → Data, quotes, resources           │
│    Stats, expert opinions, concrete examples                │
│ 4. CALL TO ACTION (1-2 lines) → Ask for their opinion       │
│    "Et toi, tu te situes où sur ce sujet ?"                 │
│    "Team A ou Team B ? Dis-moi en commentaire."             │
│                                                             │
│ TONE: Open-minded, curious, inviting dialogue               │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
                    STEP 2: APPLY LINKEDIN RULES
═══════════════════════════════════════════════════════════════

ALGORITHM OPTIMIZATION:
- Hook is CRITICAL: First 2-3 lines determine "See more" clicks
- Optimal length: 1200-1800 characters (200-400 words)
- Mobile-first: 75% users on mobile → short paragraphs
- Reading level: Age 6-9 (conversational, scannable)
- Line break after EVERY sentence
- 1-3 emojis MAX (line starts or before CTA only)
- NO external links in post body
- 3-5 hashtags at the very end

═══════════════════════════════════════════════════════════════
                    STEP 3: MATCH THE AUTHOR'S VOICE
═══════════════════════════════════════════════════════════════

CRITICAL SUCCESS METRIC:
The author reads your post and thinks "I could have written this myself."
→ Match their tone, vocabulary, sentence length from profile/examples
→ If no examples provided, use a professional but warm French tone`,
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
