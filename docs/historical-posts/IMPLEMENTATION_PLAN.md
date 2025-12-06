# Historical Posts & AI Profile Analysis - Implementation Plan

> **Feature Branch**: `feat/historical-posts-and-profile-analysis`
> **Created**: December 5, 2025
> **Status**: ✅ Complete

---

## Table of Contents

- [Overview](#overview)
- [Progress Tracker](#progress-tracker)
- [Phase 1: Foundation](#phase-1-foundation---database--models)
- [Phase 2: CRUD API](#phase-2-crud-api-for-historical-posts)
- [Phase 3: AI Analysis](#phase-3-ai-profile-analysis-service)
- [Phase 4: Generation Integration](#phase-4-integration-with-generation)
- [Phase 5: Polish](#phase-5-polish--advanced-features)
- [Technical Specifications](#technical-specifications)
- [API Reference](#api-reference)
- [Testing Strategy](#testing-strategy)
- [Risk Assessment](#risk-assessment)

---

## Overview

### Problem Statement

Currently, AI generates content based only on manual rules (bio, toneTags, doRules, dontRules). This feature enables:

1. **Enriched AI Context**: Use real published posts to understand authentic writing style
2. **Automatic Profile Generation**: Analyze posts from a platform to auto-create/enrich a profile

### Target Users

- Content creators who want AI to understand their real style
- New users who can import existing posts for quick start
- Advanced users who want to continuously refine their profile

### Key Features

- Manual addition of historical posts to a profile
- Bulk import from a platform
- Automatic analysis to generate/enrich profile (toneTags, doRules, etc.)
- Use of historical posts in generation context

---

## Progress Tracker

### Overall Progress: 5/5 Phases Complete ✅

| Phase | Name | Status | Estimated | Actual |
|-------|------|--------|-----------|--------|
| 1 | Foundation (DB & Models) | ✅ Complete | 3-4h | ~1h |
| 2 | CRUD API | ✅ Complete | 4-5h | ~1.5h |
| 3 | AI Analysis Service | ✅ Complete | 5-6h | ~2h |
| 4 | Generation Integration | ✅ Complete | 3-4h | ~1.5h |
| 5 | Polish & Advanced | ✅ Complete | 4h | ~1h |

**Legend**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Blocked

---

## Phase 1: Foundation - Database & Models

**Estimated Time**: 3-4 hours
**Status**: ✅ Complete

### Tasks

- [x] **1.1** Create migration `historical_posts`
  - Table with all necessary fields
  - Relations with profiles and platforms
  - Index for performance (profileId, platformId)

- [x] **1.2** Create model `HistoricalPost.ts`
  - TypeScript interfaces
  - Sequelize associations (belongsTo Profile, Platform)
  - Validations

- [x] **1.3** Update model `Profile.ts`
  - Add hasMany HistoricalPost association
  - Association methods getHistoricalPosts, createHistoricalPost

- [x] **1.4** Run and test migration
  - `npm run db:migrate`
  - Verify PostgreSQL schema

### Database Schema

```sql
CREATE TABLE historical_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE SET NULL,

  content TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  external_url TEXT,

  engagement JSONB DEFAULT '{}',
  -- Structure: { likes: 0, comments: 0, shares: 0, views: 0 }

  metadata JSONB DEFAULT '{}',
  -- Flexible structure for additional data

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT historical_posts_content_not_empty CHECK (char_length(content) > 0)
);

-- Performance indexes
CREATE INDEX idx_historical_posts_profile_id ON historical_posts(profile_id);
CREATE INDEX idx_historical_posts_platform_id ON historical_posts(platform_id);
CREATE INDEX idx_historical_posts_published_at ON historical_posts(published_at DESC);
CREATE INDEX idx_historical_posts_profile_platform ON historical_posts(profile_id, platform_id);
```

### Files to Create

```
migrations/YYYYMMDDHHMMSS-create-historical-posts.js
src/models/HistoricalPost.ts
```

### Files to Modify

```
src/models/Profile.ts (add association)
src/models/index.ts (export new model)
```

### Completion Checklist

- [x] Migration created and tested
- [x] Model created with TypeScript types
- [x] Associations working (Profile.getHistoricalPosts)
- [x] `npm run db:migrate` succeeds
- [x] Manual DB verification passed

---

## Phase 2: CRUD API for Historical Posts

**Estimated Time**: 4-5 hours
**Status**: ✅ Complete

### Tasks

- [x] **2.1** Create `HistoricalPostController.ts`
  - `create()`: Add a historical post
  - `getAll()`: List posts for a profile (pagination, platform filter)
  - `getById()`: Get post details
  - `update()`: Modify a post
  - `delete()`: Delete a post

- [x] **2.2** Create routes `routes/historicalPosts.ts`
  - POST /api/profiles/:profileId/historical-posts
  - GET /api/profiles/:profileId/historical-posts
  - GET /api/profiles/:profileId/historical-posts/:id
  - PATCH /api/profiles/:profileId/historical-posts/:id
  - DELETE /api/profiles/:profileId/historical-posts/:id

- [x] **2.3** Add authMiddleware and validation
  - Verify profile ownership
  - Input validation (content required, valid platformId)

- [x] **2.4** Mount routes in `routes/index.ts`

- [x] **2.5** Integration tests
  - Create test suite in `tests/integration/historicalPosts.test.ts`

### Files to Create

```
src/controllers/HistoricalPostController.ts
src/routes/historicalPosts.ts
tests/integration/historicalPosts.test.ts
```

### Files to Modify

```
src/routes/index.ts (mount new routes)
```

### Completion Checklist

- [x] All CRUD endpoints working
- [x] Authentication/authorization enforced
- [x] Input validation complete
- [x] Pagination working
- [x] Platform filtering working
- [x] Integration tests passing (15/15 tests)

---

## Phase 3: AI Profile Analysis Service

**Estimated Time**: 5-6 hours
**Status**: ✅ Complete
**Actual Time**: ~2 hours

### Tasks

- [x] **3.1** Create `ProfileAnalysisService.ts`
  - `analyzePostsForProfile(profileId)`: Analyze all posts
  - `extractStylePatterns(posts)`: AI patterns
  - `generateProfileSuggestions(analysis)`: Generate toneTags, doRules, dontRules suggestions
  - Uses OpenAI for semantic analysis

- [x] **3.2** Create analysis prompts in utils
  - Prompt to identify writing style
  - Prompt to extract DO/DON'T rules
  - Prompt to identify tone tags

- [x] **3.3** Create `ProfileAnalysisController.ts`
  - `analyzeFromPosts()`: POST /api/profiles/:id/analyze-from-posts
  - Returns profile enrichment suggestions
  - Option for auto-apply or manual review

- [x] **3.4** Add analysis route
  - POST /api/profiles/:profileId/analyze-from-posts
  - Query param: `autoApply=true/false`

- [x] **3.5** Unit tests for ProfileAnalysisService
  - Mock OpenAI responses
  - Verify pattern extraction
  - 40 unit tests passing

- [x] **3.6** Integration tests
  - 19 integration tests passing
  - Full API testing

### Analysis Prompt Template

```typescript
const analysisPrompt = `
# TASK: Analyze Writing Style

Analyze these social media posts to extract the author's unique writing style.

# POSTS TO ANALYZE
${postsText}

# OUTPUT (JSON)
{
  "toneTags": ["professional", "friendly", ...],
  "doRules": ["Use concrete examples", ...],
  "dontRules": ["Avoid jargon", ...],
  "styleInsights": {
    "averageLength": "medium",
    "emojiUsage": "moderate",
    "hashtagUsage": "minimal",
    "questionUsage": "high"
  }
}
`;
```

### Files to Create

```
src/services/ProfileAnalysisService.ts
src/controllers/ProfileAnalysisController.ts
src/utils/analysisPromptBuilder.ts
tests/unit/profileAnalysisService.test.ts
```

### Files to Modify

```
src/routes/profiles.ts (add analysis route)
```

### Completion Checklist

- [x] Analysis service working with OpenAI
- [x] Minimum 5 posts requirement enforced
- [x] JSON parsing with error handling
- [x] Auto-apply option working
- [x] Smart merging (deduplication, case-insensitive)
- [x] Unit tests passing (40/40)
- [x] Integration tests passing (19/19)
- [x] Confidence scoring based on post count
- [x] Platform filtering support
- [x] Analysis stats endpoint

---

## Phase 4: Integration with Generation

**Estimated Time**: 3-4 hours
**Status**: ✅ Complete
**Actual Time**: ~1.5 hours

### Tasks

- [x] **4.1** Update `promptBuilder.ts`
  - New function `buildHistoricalPostsContext()`
  - Include X most recent posts in prompt
  - Format: "# WRITING STYLE EXAMPLES"

- [x] **4.2** Modify `GenerateController.ts`
  - Load historical posts from profile
  - Pass to promptBuilder
  - Limit to 5 posts max (token budget: 1500)

- [x] **4.3** Optimize post selection
  - Select posts with best engagement (logarithmic scoring)
  - Same platform posts have priority (+50 points)
  - Recent vs old posts (exponential decay scoring)
  - Content length bonus for ideal posts

- [x] **4.4** End-to-end generation tests
  - 27 unit tests for historicalPostSelector
  - 8 integration tests for generation with history
  - Backward compatibility verified

### Post Selection Algorithm (Implemented)

```typescript
// Scoring factors:
// - Base score: 100
// - Engagement bonus: log(totalEngagement + 1) * 10
// - Recency bonus: 100 * 0.5^(ageInDays/30) (50% decay per month)
// - Platform match bonus: +50
// - Content length bonus: +20 for ideal length (100-1000 chars)
// - Short content penalty: -20 for posts < 50 chars
```

### Files Created

```
src/utils/historicalPostSelector.ts
tests/unit/historicalPostSelector.test.ts
tests/integration/generationWithHistory.test.ts
```

### Files Modified

```
src/utils/promptBuilder.ts (added historicalPosts to context)
src/controllers/GenerateController.ts (load and pass posts)
tests/unit/generateController.test.ts (updated expected response)
```

### Completion Checklist

- [x] Historical posts included in prompt (WRITING STYLE EXAMPLES section)
- [x] Smart selection based on platform (+50 bonus for matching)
- [x] Token limit respected (1500 tokens budget, max 5 posts)
- [x] Backward compatible (works without posts, returns historicalPostsUsed: 0)
- [x] Unit tests passing (27/27 for selector)
- [x] Integration tests passing (8/8 for generation)
- [x] Response includes historicalPostsUsed count
- [x] All 544 project tests passing

---

## Phase 5: Polish & Advanced Features

**Estimated Time**: 4 hours
**Status**: ✅ Complete
**Actual Time**: ~1 hour

### Tasks

- [x] **5.1** Bulk import endpoint
  - POST /api/profiles/:id/historical-posts/bulk
  - Accept array of posts (max 100)
  - Validation with partial failure handling
  - Returns created count, failed count, and error details

- [x] **5.2** Statistics endpoint
  - GET /api/profiles/:id/historical-posts/stats
  - Post count per platform
  - Date range (oldest/newest)
  - Engagement metrics (total and averages)

- [x] **5.3** Error handling & validation
  - Content length validation (max 50,000 characters)
  - Bulk limit (max 100 posts per request)
  - Comprehensive input validation
  - Platform existence verification

- [x] **5.4** API Documentation
  - Comprehensive API documentation in docs/historical-posts/API_DOCUMENTATION.md
  - All endpoints documented with examples
  - Error responses and rate limiting documented
  - Best practices included

- [x] **5.5** Full test suite verification
  - 544 tests passing
  - All phases validated

### Files Created

```
docs/historical-posts/API_DOCUMENTATION.md (comprehensive API docs)
```

### Files Modified

```
src/controllers/HistoricalPostController.ts (bulk, stats already existed)
src/routes/historicalPosts.ts (routes already integrated)
```

### Completion Checklist

- [x] Bulk import working (max 100 posts, partial failure handling)
- [x] Statistics endpoint working (platform breakdown, engagement metrics)
- [x] Validation complete (content length, bulk limits)
- [x] API documentation complete (docs/historical-posts/API_DOCUMENTATION.md)
- [x] All 544 tests passing

---

## Technical Specifications

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Profile Management UI                                      │  │
│  │  - Add historical posts manually                          │  │
│  │  - View/edit/delete historical posts                      │  │
│  │  - Trigger AI profile analysis                            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND API                               │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Historical Posts CRUD                                      │  │
│  │ POST   /api/profiles/:id/historical-posts                 │  │
│  │ GET    /api/profiles/:id/historical-posts                 │  │
│  │ PATCH  /api/profiles/:id/historical-posts/:postId         │  │
│  │ DELETE /api/profiles/:id/historical-posts/:postId         │  │
│  │ POST   /api/profiles/:id/analyze-from-posts               │  │
│  └────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ ProfileAnalysisService                                     │  │
│  │  - analyzePostsForProfile(): Profile insights             │  │
│  │  - extractStylePatterns(): toneTags, doRules, etc.        │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      DATABASE (PostgreSQL)                        │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ historical_posts                                           │  │
│  │  - id, profileId, platformId, content, publishedAt        │  │
│  │  - externalUrl, engagement (JSONB), metadata (JSONB)      │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      AI INTEGRATION (OpenAI)                      │
│  - Analyze writing style                                          │
│  - Extract recurring patterns                                     │
│  - Generate profile recommendations                               │
└──────────────────────────────────────────────────────────────────┘
```

### File Structure

```
src/
├── controllers/
│   ├── HistoricalPostController.ts    (NEW)
│   └── ProfileAnalysisController.ts   (NEW)
├── models/
│   ├── HistoricalPost.ts              (NEW)
│   └── Profile.ts                     (MODIFIED)
├── routes/
│   ├── historicalPosts.ts             (NEW)
│   └── index.ts                       (MODIFIED)
├── services/
│   └── ProfileAnalysisService.ts      (NEW)
├── utils/
│   ├── analysisPromptBuilder.ts       (NEW)
│   ├── historicalPostSelector.ts      (NEW)
│   └── promptBuilder.ts               (MODIFIED)
migrations/
│   └── YYYYMMDD-create-historical-posts.js (NEW)
tests/
├── integration/
│   ├── historicalPosts.test.ts        (NEW)
│   └── profileAnalysis.test.ts        (NEW)
└── unit/
    └── profileAnalysisService.test.ts (NEW)
docs/
└── historical-posts/
    ├── IMPLEMENTATION_PLAN.md         (THIS FILE)
    └── README.md                      (API DOCS)
```

---

## API Reference

### Historical Posts CRUD

#### Create Historical Post

```http
POST /api/profiles/:profileId/historical-posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Post content here...",
  "platformId": "uuid-optional",
  "publishedAt": "2024-01-15T10:30:00Z",
  "externalUrl": "https://linkedin.com/posts/...",
  "engagement": {
    "likes": 120,
    "comments": 15,
    "shares": 8
  }
}
```

**Response (201)**:
```json
{
  "id": "uuid",
  "profileId": "uuid",
  "platformId": "uuid",
  "content": "Post content...",
  "publishedAt": "2024-01-15T10:30:00Z",
  "externalUrl": "https://...",
  "engagement": { "likes": 120, "comments": 15, "shares": 8 },
  "createdAt": "2024-12-05T...",
  "updatedAt": "2024-12-05T..."
}
```

#### List Historical Posts

```http
GET /api/profiles/:profileId/historical-posts?platformId=uuid&limit=20&offset=0&sortBy=publishedAt&order=DESC
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "posts": [...],
  "pagination": {
    "total": 50,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Profile Analysis

#### Analyze Posts

```http
POST /api/profiles/:profileId/analyze-from-posts?autoApply=false
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "analysis": {
    "totalPostsAnalyzed": 25,
    "suggestions": {
      "toneTags": ["professional", "friendly", "storytelling"],
      "doRules": ["Use concrete examples", "Start with a question"],
      "dontRules": ["Avoid jargon", "Don't use all caps"],
      "styleInsights": {
        "averageLength": "medium",
        "emojiUsage": "moderate",
        "hashtagUsage": "minimal",
        "questionUsage": "high"
      }
    }
  },
  "applied": false
}
```

#### Bulk Import

```http
POST /api/profiles/:profileId/historical-posts/bulk
Authorization: Bearer <token>
Content-Type: application/json

{
  "posts": [
    { "content": "First post...", "platformId": "uuid" },
    { "content": "Second post...", "platformId": "uuid" }
  ]
}
```

**Response (201)**:
```json
{
  "created": 25,
  "failed": 2,
  "errors": [{ "index": 5, "reason": "Content is required" }]
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/profileAnalysisService.test.ts
describe('ProfileAnalysisService', () => {
  it('should analyze posts and extract style patterns');
  it('should require minimum 5 posts for analysis');
  it('should handle JSON parsing errors gracefully');
  it('should merge analysis with existing profile data');
  it('should calculate confidence based on post count');
});
```

### Integration Tests

```typescript
// tests/integration/historicalPosts.test.ts
describe('Historical Posts API', () => {
  it('should create a historical post');
  it('should list historical posts with pagination');
  it('should filter posts by platform');
  it('should prevent unauthorized access');
  it('should delete posts in cascade when profile deleted');
});
```

### E2E Tests

```typescript
// tests/integration/generationWithHistory.test.ts
describe('Generation with Historical Context', () => {
  it('should include historical posts in generation prompt');
  it('should select relevant posts based on platform');
  it('should work without historical posts (backward compatible)');
});
```

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Token overflow with too many posts | High | Medium | Limit to 5-10 posts, smart selection |
| Inaccurate AI analysis | Medium | Medium | Minimum 10 posts, human validation |
| Query performance with many posts | Medium | Low | DB indexes, pagination, cache |
| Increased OpenAI costs | High | Medium | Rate limiting, cache results |

---

## Notes & Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2024-12-05 | Plan created | Initial feature planning |
| | | |

---

## Questions to Resolve

- [ ] Post limit per profile: 50, 100, or unlimited?
- [ ] Analysis cache duration: How long? Redis or DB?
- [ ] Auto-apply by default or always require validation?
- [ ] Future: Import from third-party APIs (LinkedIn, Twitter)?

---

*Last updated: December 5, 2025*
