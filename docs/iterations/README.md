# Post Iterations API Documentation

Complete documentation for the Brandium Post Iterations resource.

## Overview

The Iterations API enables iterative refinement of generated posts. Key features include:

- **Version History**: Every post maintains a complete history of all versions
- **Iterative Refinement**: Modify existing posts with natural language instructions
- **Version Selection**: Switch between any previous version at any time
- **Context Preservation**: Iterations maintain the original profile, project, and platform context

---

## Concepts

### Post Versioning

When you generate a post via `/api/generate`, an initial version (v1) is automatically created. Each iteration creates a new version while preserving all previous ones.

```
Post Generation Flow:
┌─────────────────┐
│  /api/generate  │──────▶ Post created with Version 1 (selected)
└─────────────────┘

Iteration Flow:
┌───────────────────────────┐
│ /api/posts/:id/iterate    │──────▶ Version N+1 created (becomes selected)
└───────────────────────────┘
```

### Version Selection

Only one version can be "selected" at a time. The selected version's `generatedText` is reflected in the parent post's `generatedText` field. You can switch the selected version at any time.

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/posts/:postId/iterate` | Create a new iteration | Yes |
| `GET` | `/api/posts/:postId/versions` | List all versions | Yes |
| `GET` | `/api/posts/:postId/versions/:versionId` | Get specific version | Yes |
| `PATCH` | `/api/posts/:postId/versions/:versionId/select` | Select a version | Yes |

---

## Quick Start

### 1. Create an Iteration

```bash
curl -X POST http://localhost:5000/api/posts/POST_UUID/iterate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "iterationPrompt": "Make it more professional and add a call-to-action"
  }'
```

### 2. List All Versions

```bash
curl -X GET http://localhost:5000/api/posts/POST_UUID/versions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get a Specific Version

```bash
curl -X GET http://localhost:5000/api/posts/POST_UUID/versions/VERSION_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Select a Previous Version

```bash
curl -X PATCH http://localhost:5000/api/posts/POST_UUID/versions/VERSION_UUID/select \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API Reference

### POST /api/posts/:postId/iterate

Creates a new iteration of an existing post using AI.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postId` | UUID | **Yes** | The post to iterate on |

**Request Body:**

```json
{
  "iterationPrompt": "Make it shorter and add emojis",
  "maxTokens": 1000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `iterationPrompt` | string | **Yes** | Instructions for modifying the post |
| `maxTokens` | integer | No | Maximum tokens for generation (default: 1000) |

**Response (201):**

```json
{
  "message": "Iteration created successfully",
  "data": {
    "versionId": "990e8400-e29b-41d4-a716-446655440004",
    "versionNumber": 2,
    "generatedText": "🚀 Exciting news! We just launched AI-powered code review...",
    "iterationPrompt": "Make it shorter and add emojis",
    "isSelected": true,
    "usage": {
      "promptTokens": 350,
      "completionTokens": 80,
      "totalTokens": 430
    }
  }
}
```

**Iteration Prompt Examples:**

| Use Case | Example Prompt |
|----------|----------------|
| Tone adjustment | "Make it more professional" |
| Length modification | "Make it shorter, under 280 characters" |
| Add elements | "Add relevant emojis and hashtags" |
| Remove elements | "Remove the call-to-action" |
| Restructure | "Use bullet points instead of paragraphs" |
| Platform optimization | "Optimize for LinkedIn engagement" |

---

### GET /api/posts/:postId/versions

Returns all versions of a post ordered by version number.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postId` | UUID | **Yes** | The post to get versions for |

**Response (200):**

```json
{
  "message": "Versions retrieved successfully",
  "data": {
    "postId": "880e8400-e29b-41d4-a716-446655440003",
    "totalVersions": 3,
    "versions": [
      {
        "id": "990e8400-e29b-41d4-a716-446655440001",
        "versionNumber": 1,
        "generatedText": "Exciting news! We just launched our AI-powered code review...",
        "iterationPrompt": null,
        "isSelected": false,
        "usage": {
          "promptTokens": 250,
          "completionTokens": 100,
          "totalTokens": 350
        },
        "createdAt": "2025-12-04T10:00:00.000Z"
      },
      {
        "id": "990e8400-e29b-41d4-a716-446655440002",
        "versionNumber": 2,
        "generatedText": "🚀 Just shipped AI code review! Game-changing for devs...",
        "iterationPrompt": "Make it shorter and add emojis",
        "isSelected": false,
        "usage": {
          "promptTokens": 350,
          "completionTokens": 80,
          "totalTokens": 430
        },
        "createdAt": "2025-12-04T10:05:00.000Z"
      },
      {
        "id": "990e8400-e29b-41d4-a716-446655440003",
        "versionNumber": 3,
        "generatedText": "AI-powered code review is here. Ship better code, faster.",
        "iterationPrompt": "Make it more professional",
        "isSelected": true,
        "usage": {
          "promptTokens": 400,
          "completionTokens": 60,
          "totalTokens": 460
        },
        "createdAt": "2025-12-04T10:10:00.000Z"
      }
    ]
  }
}
```

**Version Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Version unique identifier |
| `versionNumber` | integer | Sequential version number (1, 2, 3...) |
| `generatedText` | string | The generated content for this version |
| `iterationPrompt` | string \| null | The prompt used to create this version (null for v1) |
| `isSelected` | boolean | Whether this version is currently selected |
| `usage` | object | Token usage statistics |
| `createdAt` | timestamp | When this version was created |

---

### GET /api/posts/:postId/versions/:versionId

Returns a specific version by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postId` | UUID | **Yes** | The post ID |
| `versionId` | UUID | **Yes** | The version ID to retrieve |

**Response (200):**

```json
{
  "message": "Version retrieved successfully",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440002",
    "versionNumber": 2,
    "generatedText": "🚀 Just shipped AI code review! Game-changing for devs...",
    "iterationPrompt": "Make it shorter and add emojis",
    "isSelected": false,
    "usage": {
      "promptTokens": 350,
      "completionTokens": 80,
      "totalTokens": 430
    },
    "createdAt": "2025-12-04T10:05:00.000Z"
  }
}
```

**Response (404):**

```json
{
  "error": "Not Found",
  "message": "Version not found"
}
```

---

### PATCH /api/posts/:postId/versions/:versionId/select

Selects a version as the current one. Updates the parent post's `generatedText` to match.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postId` | UUID | **Yes** | The post ID |
| `versionId` | UUID | **Yes** | The version ID to select |

**Response (200):**

```json
{
  "message": "Version selected successfully",
  "data": {
    "id": "990e8400-e29b-41d4-a716-446655440001",
    "versionNumber": 1,
    "generatedText": "Exciting news! We just launched our AI-powered code review...",
    "iterationPrompt": null,
    "isSelected": true,
    "usage": {
      "promptTokens": 250,
      "completionTokens": 100,
      "totalTokens": 350
    },
    "createdAt": "2025-12-04T10:00:00.000Z"
  }
}
```

**What Happens:**

1. The specified version's `isSelected` is set to `true`
2. All other versions' `isSelected` are set to `false`
3. The parent post's `generatedText` is updated to match the selected version
4. The parent post's `currentVersionId` is updated

---

## Error Handling

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid input (empty prompt, invalid UUID) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Post or version doesn't exist or belongs to another user |
| `429` | Rate Limit Exceeded | Too many requests to OpenAI |
| `500` | Generation Error | AI generation failed |
| `502` | API Error | OpenAI API communication error |
| `503` | Service Unavailable | API key missing or invalid |

### Validation Error Example

```json
{
  "error": "Validation Error",
  "message": "iterationPrompt is required and cannot be empty"
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

### Generation Error Example

```json
{
  "error": "Generation Error",
  "message": "Failed to generate content",
  "code": "GENERATION_FAILED"
}
```

---

## Complete Workflow Example

Here's a complete example of generating a post, iterating on it, and selecting a version:

```bash
# Step 1: Generate initial post
RESPONSE=$(curl -s -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "rawIdea": "We just launched AI-powered code review!",
    "goal": "Announce feature launch",
    "profileId": "PROFILE_UUID",
    "platformId": "PLATFORM_UUID"
  }')

POST_ID=$(echo $RESPONSE | jq -r '.data.postId')
echo "Created post: $POST_ID (Version 1)"

# Step 2: Create first iteration - make it shorter
ITERATION1=$(curl -s -X POST http://localhost:5000/api/posts/$POST_ID/iterate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"iterationPrompt": "Make it shorter, under 280 characters"}')

echo "Created Version 2: $(echo $ITERATION1 | jq -r '.data.versionNumber')"

# Step 3: Create second iteration - add emojis
ITERATION2=$(curl -s -X POST http://localhost:5000/api/posts/$POST_ID/iterate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"iterationPrompt": "Add relevant emojis"}')

echo "Created Version 3: $(echo $ITERATION2 | jq -r '.data.versionNumber')"

# Step 4: List all versions
VERSIONS=$(curl -s -X GET http://localhost:5000/api/posts/$POST_ID/versions \
  -H "Authorization: Bearer $TOKEN")

echo "Total versions: $(echo $VERSIONS | jq -r '.data.totalVersions')"

# Step 5: Select Version 2 (the shorter one without emojis)
VERSION2_ID=$(echo $VERSIONS | jq -r '.data.versions[1].id')
curl -s -X PATCH http://localhost:5000/api/posts/$POST_ID/versions/$VERSION2_ID/select \
  -H "Authorization: Bearer $TOKEN"

echo "Selected Version 2"

# Step 6: Verify the post now has Version 2's content
POST=$(curl -s -X GET http://localhost:5000/api/posts/$POST_ID \
  -H "Authorization: Bearer $TOKEN")

echo "Current post content: $(echo $POST | jq -r '.data.generatedText')"
```

---

## Iteration Prompt Construction

When you create an iteration, the AI prompt includes:

### 1. Profile Context (if available)
Same as generation - author info, tone, rules

### 2. Project Context (if available)
Same as generation - project details, audience, messages

### 3. Platform Context (if available)
Same as generation - platform guidelines, character limits

### 4. Original Request
- The original raw idea
- The original goal (if provided)

### 5. Previous Version
The currently selected version's text, wrapped for reference

### 6. Modification Request
Your iteration prompt with clear instructions

### Example Iteration Prompt

```
# PROFILE CONTEXT
[Profile details...]

# PROJECT CONTEXT
[Project details...]

# PLATFORM REQUIREMENTS
[Platform details...]

# ORIGINAL REQUEST

**Raw Idea:** We just launched AI-powered code review!
**Goal:** Announce feature launch

---

# PREVIOUS VERSION

```
Exciting news! We just launched our AI-powered code review feature...
```

---

# MODIFICATION REQUEST

Make it shorter, under 280 characters

---

# YOUR TASK

Create an improved version of the post by:
1. Maintaining the original context and intent
2. Preserving what works well in the previous version
3. Making only the requested changes
4. Keeping the same tone and style unless asked otherwise
5. Respecting platform character limits if specified

Output ONLY the final modified post text, nothing else.
```

---

## Data Model

### PostVersion

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `postId` | UUID | Parent post (FK) |
| `versionNumber` | integer | Sequential version number |
| `generatedText` | text | Generated content |
| `iterationPrompt` | text \| null | Prompt used (null for initial) |
| `isSelected` | boolean | Whether currently selected |
| `promptTokens` | integer | Tokens in prompt |
| `completionTokens` | integer | Tokens in response |
| `totalTokens` | integer | Total tokens used |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update date |

### Post (Updated Fields)

| Field | Type | Description |
|-------|------|-------------|
| `currentVersionId` | UUID \| null | Currently selected version (FK) |
| `totalVersions` | integer | Total number of versions |

---

## Source Code

| File | Description |
|------|-------------|
| [src/routes/postIterations.ts](../../src/routes/postIterations.ts) | Route definitions |
| [src/controllers/PostIterationController.ts](../../src/controllers/PostIterationController.ts) | Request handlers |
| [src/services/PostVersionService.ts](../../src/services/PostVersionService.ts) | Business logic |
| [src/models/PostVersion.ts](../../src/models/PostVersion.ts) | Sequelize model |
| [src/utils/promptBuilder.ts](../../src/utils/promptBuilder.ts) | Prompt construction |

---

## Testing

```bash
# Run all iteration tests
npm test -- --testPathPattern=iteration

# Run integration tests
npm test -- --testPathPattern=postIterations

# Run with coverage
npm run test:coverage
```

### Test Files

| File | Description |
|------|-------------|
| [tests/unit/postVersionService.test.ts](../../tests/unit/postVersionService.test.ts) | Service unit tests |
| [tests/unit/postIterationController.test.ts](../../tests/unit/postIterationController.test.ts) | Controller unit tests |
| [tests/unit/promptBuilder.test.ts](../../tests/unit/promptBuilder.test.ts) | Prompt builder tests |
| [tests/integration/postIterations.test.ts](../../tests/integration/postIterations.test.ts) | Full API flow tests |

---

## Best Practices

### Iteration Prompts

1. **Be Specific**: "Add 3 relevant hashtags" is better than "improve it"
2. **One Change at a Time**: Easier to compare and select versions
3. **Reference Platform**: "Make it fit Twitter's 280 character limit"
4. **Preserve Intent**: Don't ask for changes that contradict the original goal

### Version Management

1. **Review Before Selecting**: Compare versions before switching
2. **Use Version History**: You can always go back to any previous version
3. **Track Token Usage**: Monitor `usage.totalTokens` for cost management

---

**Last Updated:** 2025-12-05
**Version:** 1.0.0
