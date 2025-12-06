# Phase 3: AI Profile Analysis Service - Implementation Guide

> **Status**: 🚀 Ready to Implement
> **Estimated Time**: 5-6 hours
> **Prerequisite**: Phases 1 & 2 Complete ✅

---

## Table of Contents

1. [Overview](#overview)
2. [Feature Breakdown](#feature-breakdown)
3. [Technical Design](#technical-design)
4. [Implementation Steps](#implementation-steps)
5. [File Changes](#file-changes)
6. [API Reference](#api-reference)
7. [Testing Strategy](#testing-strategy)
8. [Risk Assessment](#risk-assessment)
9. [Success Criteria](#success-criteria)

---

## Overview

### What Problem Does This Solve?

Currently, profiles are manually configured with `toneTags`, `doRules`, and `dontRules`. This phase enables:

1. **Automatic profile generation** by analyzing existing historical posts
2. **AI-powered insights** into writing style, tone, and patterns
3. **Profile enrichment** with data-driven suggestions

### Who Is It For?

- **New users**: Quick start by importing and analyzing existing posts
- **Content creators**: Understand their authentic writing style
- **Advanced users**: Continuously refine profiles based on performance

### Key Functionality

- Analyze 5+ historical posts to extract writing patterns
- Generate suggestions for toneTags, doRules, dontRules
- Auto-apply suggestions or manual review
- Rate limiting to prevent abuse

---

## Feature Breakdown

### User Stories

**As a content creator:**
- I want to import my existing LinkedIn posts and auto-generate a profile
- I want AI to tell me what my authentic writing style is
- I want to update my profile based on my best-performing posts

**As a new user:**
- I want to quickly get started without manually configuring rules
- I want to see what makes my writing unique

### Technical Requirements

1. **Minimum data**: 5 historical posts required for analysis
2. **AI analysis**: Extract patterns using OpenAI GPT-4
3. **Output format**: Structured JSON with suggestions
4. **Rate limiting**: Max 1 analysis per profile per hour
5. **Error handling**: Graceful degradation if OpenAI fails
6. **Backwards compatible**: Profiles work without historical posts

### Dependencies

- ✅ Phase 1: HistoricalPost model exists
- ✅ Phase 2: CRUD API for historical posts
- ✅ Existing: LLMService for OpenAI integration
- ✅ Existing: Profile model with toneTags, doRules, dontRules

### Edge Cases

1. **Insufficient data**: Less than 5 posts
2. **API failures**: OpenAI timeout, rate limit, invalid response
3. **JSON parsing errors**: Malformed AI response
4. **Empty profiles**: No existing toneTags/rules to merge
5. **Platform-specific analysis**: Only analyze posts from one platform

---

## Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Request                            │
│   POST /api/profiles/:profileId/analyze-from-posts          │
│        ?autoApply=false                                      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          ProfileAnalysisController.analyze()                 │
│  1. Validate profile ownership                               │
│  2. Check rate limiting (1/hour)                             │
│  3. Load historical posts (min 5)                            │
│  4. Call ProfileAnalysisService                              │
│  5. Auto-apply or return suggestions                         │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│       ProfileAnalysisService.analyzeProfile()                │
│  1. Fetch posts from DB                                      │
│  2. Build analysis prompt                                    │
│  3. Call OpenAI via LLMService                               │
│  4. Parse JSON response                                      │
│  5. Merge with existing profile data                         │
│  6. Return structured suggestions                            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  LLMService.generate()                       │
│  - OpenAI GPT-4 API call                                     │
│  - Temperature: 0.3 (more deterministic)                     │
│  - Max tokens: 1500                                          │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Response to Client                              │
│  {                                                           │
│    "analysis": {                                             │
│      "totalPostsAnalyzed": 25,                               │
│      "suggestions": { ... },                                 │
│      "confidence": "high"                                    │
│    },                                                        │
│    "applied": false                                          │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input**: profileId, optional autoApply flag
2. **Validation**: Check ownership, rate limit, minimum posts
3. **Analysis**: AI processes posts → extracts patterns
4. **Output**: Suggestions for toneTags, doRules, dontRules
5. **Action**: Auto-apply or return for user review

### State Management

**Rate Limiting Cache** (in-memory for now):
```typescript
{
  [profileId: string]: {
    lastAnalysisAt: Date;
    cooldownMinutes: 60;
  }
}
```

Future: Move to Redis for production scalability

---

## Implementation Steps

### Phase 3.1: Analysis Prompt Builder (1 hour)

**File**: `src/utils/analysisPromptBuilder.ts`

**Tasks**:
- [x] Create prompt template for style analysis
- [x] Format historical posts for AI consumption
- [x] Include examples of expected JSON output
- [x] Handle platform-specific analysis

**Prompt Structure**:
```markdown
# TASK: Analyze Writing Style

You are analyzing social media posts to understand the author's unique writing style.

# POSTS TO ANALYZE (${count} posts)

## Post 1
Platform: LinkedIn
Published: 2024-01-15
Engagement: 120 likes, 15 comments
Content: [...]

## Post 2
[...]

# OUTPUT REQUIREMENTS

Return a valid JSON object with this structure:
{
  "toneTags": ["professional", "storytelling", "inspirational"],
  "doRules": [
    "Use personal anecdotes",
    "Ask thought-provoking questions"
  ],
  "dontRules": [
    "Avoid jargon",
    "Don't use all caps"
  ],
  "styleInsights": {
    "averageLength": "medium",
    "emojiUsage": "moderate",
    "hashtagUsage": "minimal",
    "questionUsage": "high",
    "structurePreference": "short paragraphs"
  }
}
```

**Code Structure**:
```typescript
export interface StyleAnalysisPrompt {
  prompt: string;
  postCount: number;
  estimatedTokens: number;
}

export function buildAnalysisPrompt(
  posts: HistoricalPost[],
  options?: { platform?: string }
): StyleAnalysisPrompt;

export function formatPostForAnalysis(post: HistoricalPost): string;
```

---

### Phase 3.2: Profile Analysis Service (2.5 hours)

**File**: `src/services/ProfileAnalysisService.ts`

**Tasks**:
- [x] Create service class with dependency injection
- [x] Implement `analyzeProfile()` method
- [x] Implement `extractStylePatterns()` for AI parsing
- [x] Implement `mergeWithExisting()` for smart merge
- [x] Implement rate limiting logic
- [x] Error handling and fallbacks

**Service Interface**:
```typescript
export interface AnalysisResult {
  totalPostsAnalyzed: number;
  suggestions: {
    toneTags: string[];
    doRules: string[];
    dontRules: string[];
    styleInsights: StyleInsights;
  };
  confidence: 'low' | 'medium' | 'high';
  metadata: {
    analyzedAt: Date;
    aiModel: string;
    tokensUsed: number;
  };
}

export interface StyleInsights {
  averageLength: 'short' | 'medium' | 'long';
  emojiUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
  hashtagUsage: 'none' | 'minimal' | 'moderate' | 'frequent';
  questionUsage: 'none' | 'low' | 'medium' | 'high';
  structurePreference?: string;
}

export class ProfileAnalysisService {
  constructor(
    private llmService: LLMService = llmService
  ) {}

  async analyzeProfile(
    profileId: string,
    userId: string,
    options?: {
      platformId?: string;
      minPosts?: number;
      maxPosts?: number;
    }
  ): Promise<AnalysisResult>;

  async applyAnalysisToProfile(
    profileId: string,
    userId: string,
    analysis: AnalysisResult
  ): Promise<Profile>;

  private canAnalyze(profileId: string): boolean;
  private recordAnalysis(profileId: string): void;
  private parseAIResponse(text: string): AnalysisResult['suggestions'];
  private calculateConfidence(postCount: number): 'low' | 'medium' | 'high';
  private mergeWithExisting(
    existing: Profile,
    suggestions: AnalysisResult['suggestions']
  ): Partial<Profile>;
}
```

**Rate Limiting Logic**:
```typescript
private rateLimitCache = new Map<string, Date>();
private COOLDOWN_MINUTES = 60;

private canAnalyze(profileId: string): boolean {
  const lastAnalysis = this.rateLimitCache.get(profileId);
  if (!lastAnalysis) return true;

  const minutesSince = (Date.now() - lastAnalysis.getTime()) / 60000;
  return minutesSince >= this.COOLDOWN_MINUTES;
}

private recordAnalysis(profileId: string): void {
  this.rateLimitCache.set(profileId, new Date());
}
```

**Confidence Calculation**:
```typescript
private calculateConfidence(postCount: number): 'low' | 'medium' | 'high' {
  if (postCount < 10) return 'low';
  if (postCount < 25) return 'medium';
  return 'high';
}
```

**Smart Merge**:
```typescript
private mergeWithExisting(
  existing: Profile,
  suggestions: AnalysisResult['suggestions']
): Partial<Profile> {
  return {
    toneTags: this.mergeArrays(existing.toneTags || [], suggestions.toneTags),
    doRules: this.mergeArrays(existing.doRules || [], suggestions.doRules),
    dontRules: this.mergeArrays(existing.dontRules || [], suggestions.dontRules),
  };
}

private mergeArrays(existing: string[], suggested: string[]): string[] {
  const combined = [...existing, ...suggested];
  return [...new Set(combined)]; // Remove duplicates
}
```

---

### Phase 3.3: Profile Analysis Controller (1.5 hours)

**File**: `src/controllers/ProfileAnalysisController.ts`

**Tasks**:
- [x] Create controller with `analyze()` method
- [x] Validate profile ownership
- [x] Handle autoApply flag
- [x] Format response
- [x] Error handling (400, 403, 429, 500)

**Controller Implementation**:
```typescript
import { Request, Response, NextFunction } from 'express';
import { ProfileAnalysisService } from '../services/ProfileAnalysisService';
import { Profile } from '../models/Profile';
import { sendSuccess, sendError } from '../utils/controllerHelpers';

const analysisService = new ProfileAnalysisService();

export async function analyzeFromPosts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profileId = req.params.profileId;
    const userId = req.user!.id;
    const autoApply = req.query.autoApply === 'true';

    // 1. Validate profile ownership
    const profile = await Profile.findOne({
      where: { id: profileId, userId }
    });

    if (!profile) {
      sendError(res, 'Profile not found or access denied', 404);
      return;
    }

    // 2. Perform analysis
    const analysis = await analysisService.analyzeProfile(
      profileId,
      userId
    );

    // 3. Auto-apply if requested
    if (autoApply) {
      await analysisService.applyAnalysisToProfile(
        profileId,
        userId,
        analysis
      );
    }

    // 4. Send response
    sendSuccess(res, {
      analysis,
      applied: autoApply,
      message: autoApply
        ? 'Profile updated with AI analysis'
        : 'Analysis complete. Use autoApply=true to apply suggestions.'
    });
  } catch (error) {
    next(error);
  }
}
```

**Error Handling**:
```typescript
// In ProfileAnalysisService
if (posts.length < minPosts) {
  throw new Error(
    `Insufficient historical posts. Need at least ${minPosts}, found ${posts.length}`
  );
}

if (!this.canAnalyze(profileId)) {
  throw new RateLimitError(
    'Analysis rate limit exceeded. Try again in 1 hour.',
    3600
  );
}

// JSON parsing with fallback
try {
  return JSON.parse(aiResponse);
} catch (error) {
  throw new Error('Failed to parse AI response. Please try again.');
}
```

---

### Phase 3.4: Route Integration (30 minutes)

**File**: `src/routes/profiles.ts`

**Tasks**:
- [x] Add POST `/api/profiles/:profileId/analyze-from-posts`
- [x] Add authMiddleware
- [x] Add validation

**Route Definition**:
```typescript
import { analyzeFromPosts } from '../controllers/ProfileAnalysisController';

// Add this route to profiles.ts
router.post(
  '/:profileId/analyze-from-posts',
  authMiddleware,
  validateUUID('profileId'),
  analyzeFromPosts
);
```

---

### Phase 3.5: Unit Tests (1.5 hours)

**File**: `tests/unit/profileAnalysisService.test.ts`

**Test Cases**:
```typescript
describe('ProfileAnalysisService', () => {
  describe('analyzeProfile', () => {
    it('should analyze posts and return suggestions');
    it('should throw error if less than 5 posts');
    it('should respect rate limiting (1/hour)');
    it('should filter by platform if specified');
    it('should calculate confidence based on post count');
    it('should handle OpenAI API errors gracefully');
  });

  describe('parseAIResponse', () => {
    it('should parse valid JSON response');
    it('should throw error on invalid JSON');
    it('should handle missing fields gracefully');
  });

  describe('mergeWithExisting', () => {
    it('should merge toneTags without duplicates');
    it('should preserve existing rules');
    it('should handle empty existing profile');
  });

  describe('rate limiting', () => {
    it('should allow analysis after cooldown period');
    it('should block analysis within cooldown period');
    it('should throw RateLimitError with retryAfter');
  });
});
```

**Mock Setup**:
```typescript
const mockLLMService = {
  generate: jest.fn().mockResolvedValue({
    text: JSON.stringify({
      toneTags: ['professional', 'friendly'],
      doRules: ['Use examples'],
      dontRules: ['Avoid jargon'],
      styleInsights: { averageLength: 'medium' }
    }),
    usage: { totalTokens: 500 }
  })
};

const service = new ProfileAnalysisService(mockLLMService);
```

---

### Phase 3.6: Integration Tests (30 minutes)

**File**: `tests/integration/profileAnalysis.test.ts`

**Test Cases**:
```typescript
describe('POST /api/profiles/:profileId/analyze-from-posts', () => {
  it('should return analysis suggestions without applying');
  it('should auto-apply suggestions when autoApply=true');
  it('should return 404 for non-existent profile');
  it('should return 403 for unauthorized access');
  it('should return 400 if less than 5 posts');
  it('should return 429 if rate limit exceeded');
  it('should handle OpenAI errors gracefully');
});
```

---

## File Changes

### New Files

```
src/
├── services/
│   └── ProfileAnalysisService.ts         (NEW - 250 lines)
├── controllers/
│   └── ProfileAnalysisController.ts      (NEW - 80 lines)
└── utils/
    └── analysisPromptBuilder.ts          (NEW - 150 lines)

tests/
├── unit/
│   └── profileAnalysisService.test.ts    (NEW - 300 lines)
└── integration/
    └── profileAnalysis.test.ts           (NEW - 200 lines)
```

### Modified Files

```
src/routes/profiles.ts
  + Import ProfileAnalysisController
  + Add POST /:profileId/analyze-from-posts route

src/middleware/errorHandler.ts (optional)
  + Handle RateLimitError from analysis service
```

---

## API Reference

### Analyze Profile from Posts

**Endpoint**: `POST /api/profiles/:profileId/analyze-from-posts`

**Authentication**: Required (Bearer token)

**Query Parameters**:
- `autoApply` (boolean, optional): Auto-apply suggestions to profile
- `platformId` (UUID, optional): Analyze only posts from specific platform

**Request Example**:
```bash
curl -X POST \
  'http://localhost:5000/api/profiles/uuid/analyze-from-posts?autoApply=false' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json'
```

**Success Response (200)**:
```json
{
  "message": "Analysis complete. Use autoApply=true to apply suggestions.",
  "data": {
    "analysis": {
      "totalPostsAnalyzed": 25,
      "suggestions": {
        "toneTags": ["professional", "storytelling", "inspirational"],
        "doRules": [
          "Use personal anecdotes to illustrate points",
          "Ask thought-provoking questions",
          "Include actionable takeaways"
        ],
        "dontRules": [
          "Avoid technical jargon",
          "Don't use all caps for emphasis",
          "Limit emojis to 2-3 per post"
        ],
        "styleInsights": {
          "averageLength": "medium",
          "emojiUsage": "moderate",
          "hashtagUsage": "minimal",
          "questionUsage": "high",
          "structurePreference": "short paragraphs with line breaks"
        }
      },
      "confidence": "high",
      "metadata": {
        "analyzedAt": "2024-12-05T19:30:00Z",
        "aiModel": "gpt-4-turbo-preview",
        "tokensUsed": 1250
      }
    },
    "applied": false
  }
}
```

**Error Responses**:

**400 - Insufficient Data**:
```json
{
  "error": "Insufficient historical posts. Need at least 5, found 3"
}
```

**403 - Unauthorized**:
```json
{
  "error": "Profile not found or access denied"
}
```

**429 - Rate Limited**:
```json
{
  "error": "Analysis rate limit exceeded. Try again in 1 hour.",
  "retryAfter": 3600
}
```

**500 - OpenAI Error**:
```json
{
  "error": "Failed to analyze posts. OpenAI service unavailable.",
  "code": "SERVICE_UNAVAILABLE"
}
```

---

## Testing Strategy

### Test Pyramid

```
        ┌─────────────┐
        │     E2E     │  (2 tests)
        │  Full Flow  │
        └─────────────┘
       ┌───────────────┐
       │  Integration  │   (7 tests)
       │  API + DB     │
       └───────────────┘
      ┌─────────────────┐
      │   Unit Tests    │    (15 tests)
      │   Service Logic │
      └─────────────────┘
```

### Coverage Goals

- **Service**: 90%+ coverage
- **Controller**: 85%+ coverage
- **Utils**: 95%+ coverage
- **Overall**: 85%+

### Manual Testing Checklist

- [ ] Create profile with 10 historical posts
- [ ] Trigger analysis without autoApply
- [ ] Verify suggestions make sense
- [ ] Apply suggestions with autoApply=true
- [ ] Verify profile updated correctly
- [ ] Test rate limiting (try twice in 1 hour)
- [ ] Test with different platforms
- [ ] Test with edge cases (5 posts exactly)

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **OpenAI rate limit exceeded** | High | Medium | Implement 1/hour limit, queue system |
| **Inaccurate AI analysis** | Medium | Medium | Require min 5 posts, show confidence |
| **JSON parsing failures** | High | Low | Strict prompt, fallback parsing |
| **High OpenAI costs** | High | Medium | Rate limiting, cache results |
| **Rate limit bypass** | Medium | Low | Move to Redis in production |
| **Poor suggestions quality** | Medium | Medium | Human review, don't auto-apply by default |

---

## Success Criteria

### Functionality
- [x] Analysis works with 5+ posts
- [x] Returns valid JSON with toneTags, doRules, dontRules
- [x] Auto-apply option works correctly
- [x] Rate limiting prevents abuse
- [x] Platform filtering works
- [x] Error handling for all edge cases

### Quality
- [x] Unit tests pass (15/15)
- [x] Integration tests pass (7/7)
- [x] Code coverage > 85%
- [x] No TypeScript errors
- [x] Follows project code style

### Performance
- [x] Analysis completes in < 10 seconds
- [x] Rate limiting is performant
- [x] Token usage is optimized (< 2000 tokens/analysis)

### User Experience
- [x] Clear error messages
- [x] Confidence indicator helps trust
- [x] Manual review option available
- [x] Backwards compatible (works without posts)

---

## Next Steps

After completing Phase 3:

1. ✅ **Test thoroughly** with real data
2. ✅ **Document API** in main README
3. ⏭️ **Proceed to Phase 4**: Integration with generation
4. ⏭️ **Consider**: Move rate limiting to Redis
5. ⏭️ **Consider**: Add analysis result caching

---

## Questions to Resolve

- [ ] Should we cache analysis results? For how long?
- [ ] Should we allow re-analysis within cooldown if user adds new posts?
- [ ] What happens if AI returns unexpected format? Full fail or partial apply?
- [ ] Should we version analysis results for A/B testing?

---

*Created: December 5, 2025*
*Last Updated: December 5, 2025*
