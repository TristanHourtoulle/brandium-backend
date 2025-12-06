# Historical Posts & AI Profile Analysis - API Documentation

> **Version**: 1.0.0
> **Last Updated**: December 6, 2025

---

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Historical Posts API](#historical-posts-api)
- [AI Profile Analysis API](#ai-profile-analysis-api)
- [Generation with Historical Context](#generation-with-historical-context)
- [Error Responses](#error-responses)
- [Rate Limiting](#rate-limiting)

---

## Overview

This API enables:
1. **Historical Posts Management**: Store and manage past social media posts
2. **AI Profile Analysis**: Automatically analyze writing style from historical posts
3. **Enhanced Generation**: Use historical posts as context for AI-generated content

### Base URL

```
http://localhost:5000/api
```

---

## Authentication

All endpoints require JWT authentication via Bearer token.

```http
Authorization: Bearer <your_jwt_token>
```

---

## Historical Posts API

### Create Historical Post

Create a new historical post for a profile.

```http
POST /api/profiles/:profileId/historical-posts
```

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| profileId | UUID | Yes | The profile ID |

**Request Body:**
```json
{
  "content": "This is my LinkedIn post about innovation...",
  "platformId": "uuid-of-platform",
  "publishedAt": "2024-01-15T10:30:00Z",
  "externalUrl": "https://linkedin.com/posts/123",
  "engagement": {
    "likes": 150,
    "comments": 25,
    "shares": 10,
    "views": 5000
  },
  "metadata": {
    "hashtags": ["tech", "innovation"],
    "mentions": ["@company"]
  }
}
```

**Response (201 Created):**
```json
{
  "message": "Historical post created successfully",
  "data": {
    "id": "uuid",
    "profileId": "uuid",
    "platformId": "uuid",
    "content": "This is my LinkedIn post...",
    "publishedAt": "2024-01-15T10:30:00.000Z",
    "externalUrl": "https://linkedin.com/posts/123",
    "engagement": { "likes": 150, "comments": 25, "shares": 10, "views": 5000 },
    "metadata": { "hashtags": ["tech", "innovation"] },
    "createdAt": "2024-12-05T19:00:00.000Z",
    "updatedAt": "2024-12-05T19:00:00.000Z"
  }
}
```

---

### List Historical Posts

Get all historical posts for a profile with pagination.

```http
GET /api/profiles/:profileId/historical-posts
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max: 100) |
| platformId | UUID | - | Filter by platform |
| sortBy | string | publishedAt | Sort field (publishedAt, createdAt, updatedAt) |
| order | string | DESC | Sort order (ASC, DESC) |

**Example:**
```http
GET /api/profiles/uuid/historical-posts?page=1&limit=10&platformId=uuid&sortBy=publishedAt&order=DESC
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid",
      "content": "Post content...",
      "publishedAt": "2024-01-15T10:30:00.000Z",
      "engagement": { "likes": 150 },
      "platform": {
        "id": "uuid",
        "name": "LinkedIn"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### Get Historical Post

Get a specific historical post by ID.

```http
GET /api/profiles/:profileId/historical-posts/:id
```

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "profileId": "uuid",
    "platformId": "uuid",
    "content": "Post content...",
    "publishedAt": "2024-01-15T10:30:00.000Z",
    "externalUrl": "https://...",
    "engagement": { "likes": 150, "comments": 25 },
    "metadata": {},
    "platform": {
      "id": "uuid",
      "name": "LinkedIn"
    },
    "createdAt": "2024-12-05T19:00:00.000Z",
    "updatedAt": "2024-12-05T19:00:00.000Z"
  }
}
```

---

### Update Historical Post

Update a historical post.

```http
PATCH /api/profiles/:profileId/historical-posts/:id
```

**Request Body (all fields optional):**
```json
{
  "content": "Updated content...",
  "platformId": "new-platform-uuid",
  "publishedAt": "2024-01-20T10:30:00Z",
  "externalUrl": "https://...",
  "engagement": { "likes": 200 },
  "metadata": { "updated": true }
}
```

**Response (200 OK):**
```json
{
  "message": "Historical post updated successfully",
  "data": { ... }
}
```

---

### Delete Historical Post

Delete a historical post.

```http
DELETE /api/profiles/:profileId/historical-posts/:id
```

**Response (200 OK):**
```json
{
  "message": "Historical post deleted successfully"
}
```

---

### Bulk Create Historical Posts

Create multiple historical posts at once (max 100).

```http
POST /api/profiles/:profileId/historical-posts/bulk
```

**Request Body:**
```json
{
  "posts": [
    {
      "content": "First post content...",
      "platformId": "uuid",
      "publishedAt": "2024-01-15T10:30:00Z",
      "engagement": { "likes": 100 }
    },
    {
      "content": "Second post content...",
      "platformId": "uuid",
      "publishedAt": "2024-01-14T10:30:00Z"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "message": "Bulk import completed: 25 created, 2 failed",
  "created": 25,
  "failed": 2,
  "errors": [
    { "index": 5, "reason": "Content is required" },
    { "index": 12, "reason": "Invalid platform ID" }
  ],
  "data": [ ... ]
}
```

---

### Get Historical Posts Statistics

Get statistics about historical posts for a profile.

```http
GET /api/profiles/:profileId/historical-posts/stats
```

**Response (200 OK):**
```json
{
  "data": {
    "totalPosts": 50,
    "byPlatform": [
      { "platformId": "uuid", "platformName": "LinkedIn", "count": 30 },
      { "platformId": "uuid", "platformName": "Twitter", "count": 15 },
      { "platformId": null, "platformName": null, "count": 5 }
    ],
    "engagement": {
      "postsWithEngagement": 40,
      "totalLikes": 5000,
      "totalComments": 500,
      "totalShares": 200,
      "totalViews": 100000,
      "averageLikes": 125,
      "averageComments": 13
    },
    "dateRange": {
      "oldest": "2023-01-15T10:30:00.000Z",
      "newest": "2024-12-01T10:30:00.000Z"
    }
  }
}
```

---

## AI Profile Analysis API

### Analyze Profile from Posts

Analyze historical posts to generate profile suggestions.

```http
POST /api/profiles/:profileId/analyze-from-posts
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| autoApply | boolean | false | Automatically apply suggestions to profile |
| platformId | UUID | - | Analyze only posts from specific platform |
| maxPosts | integer | 25 | Maximum posts to analyze (cap: 50) |

**Requirements:**
- Minimum 5 historical posts required

**Response (200 OK):**
```json
{
  "message": "Analysis complete - suggestions ready for review",
  "data": {
    "totalPostsAnalyzed": 25,
    "suggestions": {
      "toneTags": ["professional", "storytelling", "inspirational"],
      "doRules": [
        "Use personal anecdotes to illustrate points",
        "Ask thought-provoking questions",
        "Include actionable takeaways"
      ],
      "dontRules": [
        "Avoid technical jargon without explanation",
        "Don't use all caps for emphasis",
        "Avoid overly promotional language"
      ],
      "styleInsights": {
        "averageLength": "medium",
        "emojiUsage": "moderate",
        "hashtagUsage": "minimal",
        "questionUsage": "high",
        "callToActionUsage": "moderate"
      }
    },
    "confidence": 0.85,
    "applied": false
  }
}
```

---

### Get Analysis Statistics

Check if a profile is ready for analysis.

```http
GET /api/profiles/:profileId/analysis-stats
```

**Response (200 OK):**
```json
{
  "data": {
    "profileId": "uuid",
    "totalPosts": 25,
    "postsWithEngagement": 18,
    "hasEnoughPosts": true,
    "minimumRequired": 5,
    "platforms": [
      { "platformId": "uuid", "count": 15 },
      { "platformId": null, "count": 10 }
    ],
    "readyForAnalysis": true,
    "message": "Profile has enough historical posts for analysis"
  }
}
```

---

### Apply Analysis Manually

Apply previously reviewed analysis suggestions to a profile.

```http
POST /api/profiles/:profileId/apply-analysis
```

**Request Body:**
```json
{
  "toneTags": ["professional", "friendly"],
  "doRules": ["Use examples", "Ask questions"],
  "dontRules": ["Avoid jargon"]
}
```

**Response (200 OK):**
```json
{
  "message": "Analysis applied to profile successfully",
  "data": {
    "id": "uuid",
    "name": "My Profile",
    "toneTags": ["professional", "friendly"],
    "doRules": ["Use examples", "Ask questions"],
    "dontRules": ["Avoid jargon"]
  }
}
```

---

## Generation with Historical Context

When generating posts with a profile that has historical posts, the AI automatically uses them as writing style examples.

### Generate Post

```http
POST /api/generate
```

**Request Body:**
```json
{
  "profileId": "uuid",
  "projectId": "uuid",
  "platformId": "uuid",
  "goal": "Announce a new product feature",
  "rawIdea": "We just launched a new AI-powered writing assistant..."
}
```

**Response (201 Created):**
```json
{
  "message": "Post generated successfully",
  "data": {
    "postId": "uuid",
    "versionId": "uuid",
    "versionNumber": 1,
    "generatedText": "Excited to announce our latest innovation...",
    "usage": {
      "promptTokens": 500,
      "completionTokens": 150,
      "totalTokens": 650
    },
    "context": {
      "profile": { "id": "uuid", "name": "My Profile" },
      "project": { "id": "uuid", "name": "My Project" },
      "platform": { "id": "uuid", "name": "LinkedIn" },
      "historicalPostsUsed": 5
    }
  }
}
```

**Note:** The `historicalPostsUsed` field indicates how many historical posts were included in the AI prompt for style matching.

---

## Error Responses

### Common Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 400 | Validation Error | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Access denied to resource |
| 404 | Not Found | Resource does not exist |
| 429 | Rate Limit Exceeded | Too many requests |
| 500 | Internal Server Error | Server error |

### Error Response Format

```json
{
  "error": "Validation Error",
  "message": "Content is required and must be less than 50000 characters",
  "code": "VALIDATION_FAILED"
}
```

### Analysis-Specific Errors

**Insufficient Posts (400):**
```json
{
  "error": "Insufficient Data",
  "message": "Minimum 5 posts required for analysis. Currently have 3 posts.",
  "code": "INSUFFICIENT_POSTS"
}
```

**Parse Error (500):**
```json
{
  "error": "Analysis Error",
  "message": "Failed to parse AI response. Please try again.",
  "code": "PARSE_ERROR"
}
```

---

## Rate Limiting

### LLM Service Limits

| Limit | Value | Window |
|-------|-------|--------|
| Requests | 20 | per minute |
| Tokens | 40,000 | per minute |

### Rate Limit Response

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Rate limit exceeded: 20 requests per minute",
  "retryAfter": 45
}
```

### Check Rate Limit Status

```http
GET /api/generate/status
```

**Response:**
```json
{
  "data": {
    "rateLimit": {
      "requestsRemaining": 18,
      "tokensRemaining": 38000,
      "windowResetIn": 45
    },
    "service": "operational"
  }
}
```

---

## Best Practices

### Historical Posts

1. **Quality over quantity**: 10-25 high-quality posts are better than 100 mediocre ones
2. **Include engagement data**: Helps AI prioritize successful posts
3. **Add publication dates**: Enables recency scoring
4. **Platform diversity**: Include posts from multiple platforms for versatile analysis

### AI Analysis

1. **Wait for 5+ posts**: Analysis requires minimum data
2. **Review before applying**: Use `autoApply=false` first to validate suggestions
3. **Platform-specific analysis**: Filter by platform for targeted style extraction
4. **Confidence scoring**: Higher confidence = more reliable suggestions

### Generation

1. **Complete context**: Provide profile, project, and platform for best results
2. **Historical posts**: The AI automatically uses up to 5 relevant posts
3. **Platform matching**: Posts from the same platform are prioritized
4. **Iterate**: Use the iteration API to refine generated content

---

## Changelog

### v1.0.0 (December 6, 2025)
- Initial release
- Historical Posts CRUD API
- Bulk import (max 100 posts)
- Statistics endpoint
- AI Profile Analysis
- Generation with historical context
- Smart post selection algorithm

---

*Documentation generated for Brandium Backend API*
