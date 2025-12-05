# Generate API Documentation

Complete documentation for the Brandium Post Generation resource.

## Overview

The Generate API uses OpenAI's GPT models to create personalized social media posts based on your profiles, projects, and platforms. Key features include:

- **Context-Aware Generation**: Combines profile persona, project details, and platform requirements
- **Rate Limiting**: Built-in protection against API overuse
- **Post Storage**: Generated posts are automatically saved to the database
- **Usage Tracking**: Token consumption is tracked for each generation

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/generate` | Generate a new post | Yes |
| `GET` | `/api/generate/status` | Get rate limit status | Yes |

---

## Quick Start

### 1. Generate a Simple Post

```bash
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rawIdea": "Just launched a new feature that helps developers write better code!"
  }'
```

### 2. Generate with Full Context

```bash
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "rawIdea": "Just launched AI-powered code review in our platform!",
    "goal": "Announce feature launch and drive signups",
    "profileId": "550e8400-e29b-41d4-a716-446655440000",
    "projectId": "660e8400-e29b-41d4-a716-446655440001",
    "platformId": "770e8400-e29b-41d4-a716-446655440002"
  }'
```

### 3. Check Rate Limit Status

```bash
curl -X GET http://localhost:5000/api/generate/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API Reference

### POST /api/generate

Generates a new social media post using AI.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rawIdea": "Just launched a new feature!",
  "goal": "Announce feature and drive engagement",
  "profileId": "550e8400-e29b-41d4-a716-446655440000",
  "projectId": "660e8400-e29b-41d4-a716-446655440001",
  "platformId": "770e8400-e29b-41d4-a716-446655440002"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rawIdea` | string | **Yes** | The core idea to transform into a post |
| `goal` | string | No | The objective of the post (e.g., "drive signups") |
| `profileId` | UUID | No | Profile to use for tone and style |
| `projectId` | UUID | No | Project for context and key messages |
| `platformId` | UUID | No | Platform for style guidelines and limits |

**Response (201):**
```json
{
  "message": "Post generated successfully",
  "data": {
    "postId": "880e8400-e29b-41d4-a716-446655440003",
    "versionId": "990e8400-e29b-41d4-a716-446655440001",
    "versionNumber": 1,
    "generatedText": "Exciting news! We just launched AI-powered code review...",
    "usage": {
      "promptTokens": 250,
      "completionTokens": 100,
      "totalTokens": 350
    },
    "context": {
      "profile": { "id": "550e8400-...", "name": "Dev Persona" },
      "project": { "id": "660e8400-...", "name": "CodeReview Pro" },
      "platform": { "id": "770e8400-...", "name": "LinkedIn" }
    }
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `postId` | UUID | The created post's ID |
| `versionId` | UUID | The initial version's ID (v1) |
| `versionNumber` | integer | Always `1` for initial generation |
| `generatedText` | string | The AI-generated content |
| `usage` | object | Token consumption statistics |
| `context` | object | References to entities used for generation |

> **Note:** Each generated post now automatically creates an initial version (v1). You can iterate on this post using the [Iterations API](../iterations/README.md) to create additional versions.

---

### GET /api/generate/status

Returns current rate limit status and service health.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "data": {
    "rateLimit": {
      "requestsRemaining": 18,
      "tokensRemaining": 39500,
      "windowResetIn": 45
    },
    "service": "operational"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `requestsRemaining` | number | Requests left in current window |
| `tokensRemaining` | number | Tokens left in current window |
| `windowResetIn` | number | Seconds until rate limit resets |
| `service` | string | Service status ("operational") |

---

## Error Handling

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid input (missing rawIdea, invalid UUID) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Referenced profile/project/platform doesn't exist |
| `429` | Rate Limit Exceeded | Too many requests or tokens used |
| `500` | Generation Error | AI generation failed |
| `502` | API Error | OpenAI API communication error |
| `503` | Service Unavailable | API key missing or invalid |

### Validation Error Example

```json
{
  "error": "Validation Error",
  "details": [
    {
      "type": "field",
      "value": "",
      "msg": "rawIdea is required",
      "path": "rawIdea",
      "location": "body"
    }
  ]
}
```

### Rate Limit Error Example

```json
{
  "error": "Rate Limit Exceeded",
  "message": "Request limit exceeded. Please wait before making more requests.",
  "retryAfter": 30
}
```

### Service Error Example

```json
{
  "error": "Generation Error",
  "message": "OpenAI API key is not configured",
  "code": "API_KEY_MISSING"
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `API_KEY_MISSING` | OpenAI API key not configured |
| `INVALID_API_KEY` | OpenAI API key is invalid |
| `SERVICE_UNAVAILABLE` | OpenAI service is unavailable |
| `EMPTY_RESPONSE` | AI returned empty response |
| `API_ERROR` | OpenAI API returned an error |
| `GENERATION_FAILED` | Content generation failed |

---

## Rate Limiting

The Generate API implements rate limiting to prevent overuse of the OpenAI API.

### Default Limits

| Limit | Default Value | Environment Variable |
|-------|---------------|---------------------|
| Requests per minute | 20 | `OPENAI_MAX_REQUESTS_PER_MINUTE` |
| Tokens per minute | 40,000 | `OPENAI_MAX_TOKENS_PER_MINUTE` |

### How It Works

1. Each request decrements the `requestsRemaining` counter
2. Token usage is tracked and decrements `tokensRemaining`
3. Counters reset automatically after 60 seconds
4. When limits are reached, requests return `429` with `retryAfter`

### Best Practices

- Check `/api/generate/status` before making generation requests
- Implement exponential backoff when receiving `429` errors
- Cache generated content to avoid regenerating the same posts

---

## Prompt Construction

The AI prompt is built from the provided context in this order:

### 1. Profile Context (if provided)
- Author name and bio
- Tone and style tags
- Do rules (what to include)
- Don't rules (what to avoid)

### 2. Project Context (if provided)
- Project name and description
- Target audience
- Key messages

### 3. Platform Context (if provided)
- Platform name
- Style guidelines
- Character limits

### 4. Task Section (always included)
- Goal (if provided)
- Raw idea to transform
- Generation instructions

### Example Prompt Structure

```
# PROFILE CONTEXT

## Author Name
Tristan - Freelance Dev

## Tone & Style Tags
- professional
- friendly

## DO (Follow these rules)
- Use concrete examples
- Stay concise

---

# PROJECT CONTEXT

## Project Name
Edukai

## Description
AI-powered learning platform

## Target Audience
Students and lifelong learners

---

# PLATFORM REQUIREMENTS

## Platform
LinkedIn

## Character Limit
Maximum 3000 characters.

---

# YOUR TASK

## Goal
Announce new AI tutoring feature

## Raw Idea to Transform
We just launched personalized AI tutoring!

## Instructions
1. Transform the raw idea into an engaging social media post.
2. Apply the profile's tone and style if provided.
3. Consider the project's audience and key messages if provided.
4. Follow the platform's guidelines and character limits if provided.
5. Make the post authentic, engaging, and actionable.
6. Output ONLY the final post text, nothing else.
```

---

## Data Model

### Post (Generated Content)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner's user ID (FK) |
| `profileId` | UUID | Profile used (FK, nullable) |
| `projectId` | UUID | Project used (FK, nullable) |
| `platformId` | UUID | Platform used (FK, nullable) |
| `goal` | text | Post objective (nullable) |
| `rawIdea` | text | Original idea input |
| `generatedText` | text | AI-generated content |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update date |

---

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key

# Optional (rate limiting)
OPENAI_MAX_REQUESTS_PER_MINUTE=20
OPENAI_MAX_TOKENS_PER_MINUTE=40000
```

### Model Configuration

The service uses `gpt-4.1-mini` by default with these settings:
- Temperature: 0.7
- Max tokens: 1000

---

## Source Code

| File | Description |
|------|-------------|
| [src/routes/generate.ts](../../src/routes/generate.ts) | Route definitions |
| [src/controllers/GenerateController.ts](../../src/controllers/GenerateController.ts) | Request handlers |
| [src/services/LLMService.ts](../../src/services/LLMService.ts) | OpenAI integration |
| [src/utils/promptBuilder.ts](../../src/utils/promptBuilder.ts) | Prompt construction |
| [src/middleware/validators.ts](../../src/middleware/validators.ts) | Input validation |

---

## Testing

Tests are designed to mock the OpenAI API to avoid token consumption:

```bash
# Run all generate tests
npm test -- --testPathPattern=generate

# Run with coverage
npm run test:coverage
```

### Test Files

| File | Description |
|------|-------------|
| [tests/unit/llmService.test.ts](../../tests/unit/llmService.test.ts) | Rate limiting and error classes |
| [tests/unit/promptBuilder.test.ts](../../tests/unit/promptBuilder.test.ts) | Prompt construction |
| [tests/unit/generateController.test.ts](../../tests/unit/generateController.test.ts) | Controller with mocked LLM |
| [tests/integration/generate.test.ts](../../tests/integration/generate.test.ts) | Full API flow tests |

---

**Last Updated:** 2025-12-05
**Version:** 1.1.0
