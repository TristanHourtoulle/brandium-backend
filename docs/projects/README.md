# Projects API Documentation

Complete documentation for the Brandium Projects resource.

## Overview

Projects represent your initiatives, products, or campaigns. Each project stores:

- **Name**: The project's display name (e.g., "Edukai")
- **Description**: Details about the project
- **Audience**: Target audience description
- **Key Messages**: Core messages to convey

---

## Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/projects` | List all projects | Yes |
| `GET` | `/api/projects/:id` | Get project by ID | Yes |
| `POST` | `/api/projects` | Create a new project | Yes |
| `PUT` | `/api/projects/:id` | Update a project | Yes |
| `DELETE` | `/api/projects/:id` | Delete a project | Yes |

---

## Quick Start

### 1. Create a Project

```bash
curl -X POST http://localhost:5000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Edukai",
    "description": "Adaptive learning platform for education",
    "audience": "Educators, students, and institutions",
    "keyMessages": ["Innovation", "Personalization", "Accessibility"]
  }'
```

### 2. List All Projects

```bash
curl -X GET http://localhost:5000/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## API Reference

### GET /api/projects

Returns all projects for the authenticated user.

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
      "name": "Edukai",
      "description": "Adaptive learning platform",
      "audience": "Educators and students",
      "keyMessages": ["Innovation", "Personalization"],
      "createdAt": "2025-12-04T10:00:00.000Z",
      "updatedAt": "2025-12-04T10:00:00.000Z"
    }
  ]
}
```

---

### GET /api/projects/:id

Returns a specific project by ID.

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
    "name": "Edukai",
    "description": "Adaptive learning platform",
    "audience": "Educators and students",
    "keyMessages": ["Innovation", "Personalization"],
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

**Response (404):**
```json
{
  "error": "Not Found",
  "message": "Project not found"
}
```

---

### POST /api/projects

Creates a new project.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Edukai",
  "description": "Adaptive learning platform for education",
  "audience": "Educators, students, and institutions",
  "keyMessages": ["Innovation", "Personalization", "Accessibility"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name (1-255 chars) |
| `description` | string | No | Project description |
| `audience` | string | No | Target audience |
| `keyMessages` | string[] | No | Array of key messages |

**Response (201):**
```json
{
  "message": "Project created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user-uuid",
    "name": "Edukai",
    "description": "Adaptive learning platform for education",
    "audience": "Educators, students, and institutions",
    "keyMessages": ["Innovation", "Personalization", "Accessibility"],
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T10:00:00.000Z"
  }
}
```

---

### PUT /api/projects/:id

Updates an existing project.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body (all fields optional):**
```json
{
  "name": "Edukai 2.0",
  "keyMessages": ["AI-powered", "Scalable"]
}
```

**Response (200):**
```json
{
  "message": "Project updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Edukai 2.0",
    "description": "Original description unchanged",
    "audience": "Original audience unchanged",
    "keyMessages": ["AI-powered", "Scalable"],
    "createdAt": "2025-12-04T10:00:00.000Z",
    "updatedAt": "2025-12-04T11:00:00.000Z"
  }
}
```

---

### DELETE /api/projects/:id

Deletes a project.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Project deleted successfully"
}
```

---

## Error Handling

### Common Errors

| Status | Error | Description |
|--------|-------|-------------|
| `400` | Validation Error | Invalid input (missing name, invalid UUID, etc.) |
| `401` | Unauthorized | Missing or invalid JWT token |
| `404` | Not Found | Project doesn't exist or belongs to another user |

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

### Project

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner's user ID (FK) |
| `name` | string(255) | Project display name |
| `description` | text | Project description |
| `audience` | text | Target audience |
| `keyMessages` | JSONB | Array of key messages |
| `createdAt` | timestamp | Creation date |
| `updatedAt` | timestamp | Last update date |

---

## Source Code

| File | Description |
|------|-------------|
| [src/routes/projects.ts](../../src/routes/projects.ts) | Route definitions |
| [src/controllers/ProjectController.ts](../../src/controllers/ProjectController.ts) | CRUD handlers |
| [src/models/Project.ts](../../src/models/Project.ts) | Sequelize model |
| [src/middleware/validators.ts](../../src/middleware/validators.ts) | Input validation |

---

**Last Updated:** 2025-12-04
**Version:** 1.0.0
