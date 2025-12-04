# Profiles API Documentation

Complete documentation for the Brandium Profiles resource.

## Overview

Profiles represent different personas or identities you can use when generating content. Each profile stores:

- **Name**: The profile's display name (e.g., "Tristan - Freelance Dev")
- **Bio**: A description of the persona
- **Tone Tags**: Keywords describing the communication style
- **Do Rules**: Guidelines for what the AI should do
- **Don't Rules**: Guidelines for what the AI should avoid

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/profiles` | List all profiles | Yes |
| `GET` | `/api/profiles/:id` | Get profile by ID | Yes |
| `POST` | `/api/profiles` | Create a new profile | Yes |
| `PUT` | `/api/profiles/:id` | Update a profile | Yes |
| `DELETE` | `/api/profiles/:id` | Delete a profile | Yes |

---

## Quick Start

### 1. Create a Profile

```bash
curl -X POST http://localhost:5000/api/profiles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Tristan - Freelance Dev",
    "bio": "Passionate React & Next.js developer",
    "toneTags": ["professional", "friendly", "expert"],
    "doRules": ["Use concrete examples", "Stay concise"],
    "dontRules": ["Avoid jargon", "No excessive caps"]
  }'
```

### 2. List All Profiles

```bash
curl -X GET http://localhost:5000/api/profiles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API Reference

### GET /api/profiles

Returns all profiles for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "count": 2,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "user-uuid",
      "name": "Tristan - Freelance Dev",
      "bio": "Passionate React developer",
      "toneTags": ["professional", "friendly"],
      "doRules": ["Be concise"],
      "dontRules": ["No jargon"],
      "createdAt": "2025-12-04T10:00:00.000Z",
      "updatedAt": "2025-12-04T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/profiles/:id

Returns a specific profile by ID.

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
    "name": "Tristan - Freelance Dev",
    "bio": "Passionate React developer",
    "toneTags": ["professional", "friendly"],
    "doRules": ["Be concise"],
    "dontRules": ["No jargon"],
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

**Response (404):**
```json
{
  "error": "Not Found",
  "message": "Profile not found"
}
```

---

### POST /api/profiles

Creates a new profile.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Tristan - Freelance Dev",
  "bio": "Passionate React developer",
  "toneTags": ["professional", "friendly"],
  "doRules": ["Be concise", "Use examples"],
  "dontRules": ["No jargon"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Profile name (1-255 chars) |
| `bio` | string | No | Profile description |
| `toneTags` | string[] | No | Array of tone keywords |
| `doRules` | string[] | No | Array of "do" guidelines |
| `dontRules` | string[] | No | Array of "don't" guidelines |

**Response (201):**
```json
{
  "message": "Profile created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid",
    "name": "Tristan - Freelance Dev",
    "bio": "Passionate React developer",
    "toneTags": ["professional", "friendly"],
    "doRules": ["Be concise", "Use examples"],
    "dontRules": ["No jargon"],
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

---

### PUT /api/profiles/:id

Updates an existing profile.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "toneTags": ["expert", "mentor"]
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Updated Name",
    "toneTags": ["expert", "mentor"],
    "bio": "Original bio unchanged",
    "doRules": ["Original rules unchanged"],
    "dontRules": ["Original rules unchanged"],
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T11:00:00.000Z"
  }
}
```

---

### DELETE /api/profiles/:id

Deletes a profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Profile deleted successfully"
}
```

---

## Error Handling

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid input (missing name, invalid UUID, etc.) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Profile doesn't exist or belongs to another user |

### Validation Error Example

```json
{
  "error": "Validation Error",
  "details": [
    {
      "type": "field",
      "value": "",
      "msg": "Name is required and must be less than 255 characters",
      "path": "name",
      "location": "body"
    }
  ]
}
```

---

## Data Model

### Profile

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner's user ID (FK) |
| `name` | string(255) | Profile display name |
| `bio` | text | Profile description |
| `toneTags` | JSONB | Array of tone keywords |
| `doRules` | JSONB | Array of "do" guidelines |
| `dontRules` | JSONB | Array of "don't" guidelines |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update date |

---

## Source Code

| File | Description |
|------|-------------|
| [src/routes/profiles.ts](../../src/routes/profiles.ts) | Route definitions |
| [src/controllers/ProfileController.ts](../../src/controllers/ProfileController.ts) | CRUD handlers |
| [src/models/Profile.ts](../../src/models/Profile.ts) | Sequelize model |
| [src/middleware/validators.ts](../../src/middleware/validators.ts) | Input validation |

---

**Last Updated:** 2025-12-04
**Version:** 1.0.0
