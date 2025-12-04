# Platforms API Documentation

Complete documentation for the Brandium Platforms resource.

## Overview

Platforms represent social media channels or publishing destinations. Each platform stores:

- **Name**: The platform name (e.g., "LinkedIn", "X", "TikTok")
- **Style Guidelines**: Writing guidelines for this platform
- **Max Length**: Character limit for posts (optional)

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/platforms` | List all platforms | Yes |
| `GET` | `/api/platforms/:id` | Get platform by ID | Yes |
| `POST` | `/api/platforms` | Create a new platform | Yes |
| `PUT` | `/api/platforms/:id` | Update a platform | Yes |
| `DELETE` | `/api/platforms/:id` | Delete a platform | Yes |

---

## Quick Start

### 1. Create a Platform

```bash
curl -X POST http://localhost:5000/api/platforms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "LinkedIn",
    "styleGuidelines": "Professional tone, thought leadership, industry expertise",
    "maxLength": 3000
  }'
```

### 2. List All Platforms

```bash
curl -X GET http://localhost:5000/api/platforms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API Reference

### GET /api/platforms

Returns all platforms for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "count": 3,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-uuid",
      "name": "LinkedIn",
      "styleGuidelines": "Professional tone, thought leadership",
      "maxLength": 3000,
      "createdAt": "2025-12-04T10:00:00.000Z",
      "updatedAt": "2025-12-04T10:00:00.000Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "userId": "user-uuid",
      "name": "X",
      "styleGuidelines": "Concise, engaging, use hashtags",
      "maxLength": 280,
      "createdAt": "2025-12-04T10:00:00.000Z",
      "updatedAt": "2025-12-04T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/platforms/:id

Returns a specific platform by ID.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid",
    "name": "LinkedIn",
    "styleGuidelines": "Professional tone, thought leadership",
    "maxLength": 3000,
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

**Response (404):**
```json
{
  "error": "Not Found",
  "message": "Platform not found"
}
```

---

### POST /api/platforms

Creates a new platform.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "LinkedIn",
  "styleGuidelines": "Professional tone, thought leadership, industry expertise",
  "maxLength": 3000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Platform name (1-100 chars) |
| `styleGuidelines` | string | No | Writing guidelines |
| `maxLength` | integer | No | Character limit (must be > 0) |

**Response (201):**
```json
{
  "message": "Platform created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid",
    "name": "LinkedIn",
    "styleGuidelines": "Professional tone, thought leadership, industry expertise",
    "maxLength": 3000,
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

---

### PUT /api/platforms/:id

Updates an existing platform.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "LinkedIn Pro",
  "maxLength": 2500
}
```

**Response (200):**
```json
{
  "message": "Platform updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "LinkedIn Pro",
    "styleGuidelines": "Original guidelines unchanged",
    "maxLength": 2500,
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T11:00:00.000Z"
  }
}
```

---

### DELETE /api/platforms/:id

Deletes a platform.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Platform deleted successfully"
}
```

---

## Common Platform Examples

### LinkedIn

```json
{
  "name": "LinkedIn",
  "styleGuidelines": "Professional tone. Share expertise and thought leadership. Use bullet points for readability. Include calls to action.",
  "maxLength": 3000
}
```

### X (Twitter)

```json
{
  "name": "X",
  "styleGuidelines": "Concise and punchy. Use hashtags sparingly. Engage with trends. Thread complex topics.",
  "maxLength": 280
}
```

### TikTok

```json
{
  "name": "TikTok",
  "styleGuidelines": "Casual and trendy. Use Gen Z language. Reference current trends. Keep it fun.",
  "maxLength": null
}
```

### Blog

```json
{
  "name": "Blog",
  "styleGuidelines": "Long-form content. Detailed explanations. Include code examples. SEO-optimized.",
  "maxLength": null
}
```

---

## Error Handling

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid input (missing name, invalid UUID, negative maxLength) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Platform doesn't exist or belongs to another user |

### Validation Error Example

```json
{
  "error": "Validation Error",
  "details": [
    {
      "type": "field",
      "value": -100,
      "msg": "maxLength must be a positive integer",
      "path": "maxLength",
      "location": "body"
    }
  ]
}
```

---

## Data Model

### Platform

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner's user ID (FK) |
| `name` | string(100) | Platform display name |
| `styleGuidelines` | text | Writing guidelines |
| `maxLength` | integer | Character limit (nullable) |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update date |

---

## Source Code

| File | Description |
|------|-------------|
| [src/routes/platforms.ts](../../src/routes/platforms.ts) | Route definitions |
| [src/controllers/PlatformController.ts](../../src/controllers/PlatformController.ts) | CRUD handlers |
| [src/models/Platform.ts](../../src/models/Platform.ts) | Sequelize model |
| [src/middleware/validators.ts](../../src/middleware/validators.ts) | Input validation |

---

**Last Updated:** 2025-12-04
**Version:** 1.0.0
