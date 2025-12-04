# Posts API Documentation

Complete documentation for the Brandium Posts resource.

## Overview

Posts represent the generated content history. Each post stores:

- **Raw Idea**: The original input idea from the user
- **Generated Text**: The AI-generated post content
- **Goal**: The objective for the post (optional)
- **Related Entities**: Links to profile, project, and platform used for generation

Posts are created automatically when using the `/api/generate` endpoint. This API provides read and delete operations for managing your generated content history.

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/posts` | List all posts (paginated) | Yes |
| `GET` | `/api/posts/:id` | Get post by ID | Yes |
| `DELETE` | `/api/posts/:id` | Delete a post | Yes |

---

## Quick Start

### 1. List All Posts

```bash
curl -X GET http://localhost:5000/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get a Specific Post

```bash
curl -X GET http://localhost:5000/api/posts/POST_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Delete a Post

```bash
curl -X DELETE http://localhost:5000/api/posts/POST_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API Reference

### GET /api/posts

Returns all posts for the authenticated user with pagination.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (min: 1) |
| `limit` | integer | 10 | Items per page (min: 1, max: 100) |

**Response (200):**
```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "userId": "user-uuid",
      "rawIdea": "Just launched AI-powered code review!",
      "generatedText": "Exciting news! We just shipped...",
      "goal": "Announce feature launch",
      "profileId": "550e8400-e29b-41d4-a716-446655440000",
      "projectId": "660e8400-e29b-41d4-a716-446655440001",
      "platformId": "770e8400-e29b-41d4-a716-446655440002",
      "profile": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Tristan - Dev"
      },
      "project": {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "CodeReview Pro"
      },
      "platform": {
        "id": "770e8400-e29b-41d4-a716-446655440002",
        "name": "LinkedIn"
      },
      "createdAt": "2025-12-04T10:00:00.000Z",
      "updatedAt": "2025-12-04T10:00:00.000Z"
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

**Pagination Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `page` | number | Current page number |
| `limit` | number | Items per page |
| `total` | number | Total number of posts |
| `totalPages` | number | Total number of pages |
| `hasNext` | boolean | Whether there is a next page |
| `hasPrev` | boolean | Whether there is a previous page |

**Examples:**

```bash
# Get first page with 10 items (default)
curl -X GET "http://localhost:5000/api/posts" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get page 2 with 5 items per page
curl -X GET "http://localhost:5000/api/posts?page=2&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get page 1 with maximum items (100)
curl -X GET "http://localhost:5000/api/posts?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### GET /api/posts/:id

Returns a specific post by ID with full related entity details.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "data": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "userId": "user-uuid",
    "rawIdea": "Just launched AI-powered code review!",
    "generatedText": "Exciting news! We just shipped our AI-powered code review feature...",
    "goal": "Announce feature launch and drive signups",
    "profileId": "550e8400-e29b-41d4-a716-446655440000",
    "projectId": "660e8400-e29b-41d4-a716-446655440001",
    "platformId": "770e8400-e29b-41d4-a716-446655440002",
    "profile": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Tristan - Dev",
      "bio": "Passionate React developer",
      "toneTags": ["professional", "friendly"]
    },
    "project": {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "CodeReview Pro",
      "description": "AI-powered code review platform",
      "audience": "Software developers"
    },
    "platform": {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "LinkedIn",
      "styleGuidelines": "Professional, engaging",
      "maxLength": 3000
    },
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

**Response (404):**
```json
{
  "error": "Not Found",
  "message": "Post not found"
}
```

**Note:** The single post view includes more details about related entities compared to the list view.

---

### DELETE /api/posts/:id

Deletes a post permanently.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Post deleted successfully"
}
```

**Response (404):**
```json
{
  "error": "Not Found",
  "message": "Post not found"
}
```

---

## Error Handling

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid input (invalid UUID, invalid pagination) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Post doesn't exist or belongs to another user |

### Validation Error Examples

**Invalid UUID:**
```json
{
  "error": "Validation Error",
  "details": [
    {
      "type": "field",
      "value": "not-a-uuid",
      "msg": "Invalid post ID",
      "path": "id",
      "location": "params"
    }
  ]
}
```

**Invalid Pagination:**
```json
{
  "error": "Validation Error",
  "details": [
    {
      "type": "field",
      "value": "0",
      "msg": "Page must be a positive integer",
      "path": "page",
      "location": "query"
    }
  ]
}
```

---

## Data Model

### Post

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner's user ID (FK) |
| `profileId` | UUID | Profile used for generation (FK, nullable) |
| `projectId` | UUID | Project used for context (FK, nullable) |
| `platformId` | UUID | Platform used for style (FK, nullable) |
| `goal` | text | Post objective (nullable) |
| `rawIdea` | text | Original input idea |
| `generatedText` | text | AI-generated content |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update date |

### Related Entities in List View

| Entity | Included Fields |
|--------|-----------------|
| `profile` | `id`, `name` |
| `project` | `id`, `name` |
| `platform` | `id`, `name` |

### Related Entities in Single View

| Entity | Included Fields |
|--------|-----------------|
| `profile` | `id`, `name`, `bio`, `toneTags` |
| `project` | `id`, `name`, `description`, `audience` |
| `platform` | `id`, `name`, `styleGuidelines`, `maxLength` |

---

## Ordering

Posts are always ordered by `createdAt` in descending order (newest first).

---

## Creating Posts

Posts are not created directly via this API. They are created automatically when using the `/api/generate` endpoint. See the [Generate API Documentation](../generate/README.md) for more details.

---

## Related Entities Behavior

When related entities (profile, project, platform) are deleted:
- The post is **NOT** deleted
- The corresponding foreign key field is set to `NULL`
- The related entity in responses will be `null`

This ensures your post history is preserved even if you delete profiles, projects, or platforms.

---

## Source Code

| File | Description |
|------|-------------|
| [src/routes/posts.ts](../../src/routes/posts.ts) | Route definitions |
| [src/controllers/PostController.ts](../../src/controllers/PostController.ts) | Read/Delete handlers |
| [src/models/Post.ts](../../src/models/Post.ts) | Sequelize model |
| [src/middleware/validators.ts](../../src/middleware/validators.ts) | Input validation |

---

## Testing

```bash
# Run all post tests
npm test -- --testPathPatterns=posts

# Run with coverage
npm run test:coverage
```

### Test Files

| File | Description |
|------|-------------|
| [tests/unit/postController.test.ts](../../tests/unit/postController.test.ts) | Controller unit tests |
| [tests/integration/posts.test.ts](../../tests/integration/posts.test.ts) | Full API flow tests |

---

**Last Updated:** 2025-12-04
**Version:** 1.0.0
