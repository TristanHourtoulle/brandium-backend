# Authentication API Documentation

Complete reference for all authentication endpoints in the Brandium API.

## Table of Contents

- [Overview](#overview)
- [Authentication Flow](#authentication-flow)
- [Endpoints](#endpoints)
  - [POST /api/auth/register](#post-apiauthregister)
  - [POST /api/auth/login](#post-apiauthlogin)
  - [GET /api/auth/me](#get-apiauthme)
- [Error Handling](#error-handling)
- [Security](#security)

---

## Overview

The authentication system uses JSON Web Tokens (JWT) for stateless authentication. After successful registration or login, clients receive a JWT token that must be included in subsequent requests to protected endpoints.

**Base URL:** `http://localhost:3000/api/auth`

**Authentication Method:** Bearer Token (JWT)

**Token Expiration:** Configurable via `JWT_EXPIRES_IN` environment variable (default: 7 days)

---

## Authentication Flow

```
┌─────────┐                                    ┌─────────┐
│ Client  │                                    │  Server │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  POST /api/auth/register                    │
     │  { email, password }                        │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                          201 Created         │
     │  { user, token, message }                   │
     │<─────────────────────────────────────────────┤
     │                                              │
     │  GET /api/auth/me                           │
     │  Authorization: Bearer <token>              │
     ├─────────────────────────────────────────────>│
     │                                              │
     │                          200 OK              │
     │  { user }                                    │
     │<─────────────────────────────────────────────┤
     │                                              │
```

---

## Endpoints

### POST /api/auth/register

Register a new user account.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules:**
- `email`: Must be a valid email format
- `password`: Minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, and one number

#### Success Response (201 Created)

```json
{
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2025-12-03T20:30:00.000Z",
    "updatedAt": "2025-12-03T20:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

**400 Bad Request** - Validation error
```json
{
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email"
    },
    {
      "field": "password",
      "message": "must be at least 8 characters long"
    }
  ]
}
```

**409 Conflict** - User already exists
```json
{
  "error": "Conflict",
  "message": "User already exists with this email"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

#### Examples

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

const data = await response.json();

if (response.ok) {
  // Store token for future requests
  localStorage.setItem('token', data.token);
  console.log('Registered user:', data.user);
} else {
  console.error('Registration failed:', data);
}
```

**TypeScript:**
```typescript
interface RegisterResponse {
  message: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
}

const register = async (
  email: string,
  password: string
): Promise<RegisterResponse> => {
  const response = await fetch('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Registration failed: ${response.statusText}`);
  }

  return response.json();
};
```

---

### POST /api/auth/login

Authenticate an existing user and receive a JWT token.

#### Request

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Validation Rules:**
- `email`: Must be a valid email format
- `password`: Required, minimum 1 character

#### Success Response (200 OK)

```json
{
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2025-12-03T20:30:00.000Z",
    "updatedAt": "2025-12-03T20:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Responses

**400 Bad Request** - Validation error
```json
{
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email"
    }
  ]
}
```

**401 Unauthorized** - Invalid credentials
```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

#### Examples

**cURL:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePassword123!',
  }),
});

const data = await response.json();

if (response.ok) {
  // Store token for future requests
  localStorage.setItem('token', data.token);
  console.log('Logged in user:', data.user);
} else {
  console.error('Login failed:', data);
}
```

**TypeScript:**
```typescript
interface LoginResponse {
  message: string;
  user: {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
}

const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  return response.json();
};
```

---

### GET /api/auth/me

Get the currently authenticated user's information. This is a protected route that requires a valid JWT token.

#### Request

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Body:** None

#### Success Response (200 OK)

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "createdAt": "2025-12-03T20:30:00.000Z",
    "updatedAt": "2025-12-03T20:30:00.000Z"
  }
}
```

#### Error Responses

**401 Unauthorized** - Missing or invalid token
```json
{
  "error": "Unauthorized",
  "message": "No token provided or invalid format"
}
```

```json
{
  "error": "Unauthorized",
  "message": "Token is missing"
}
```

```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

```json
{
  "error": "Unauthorized",
  "message": "Token expired"
}
```

```json
{
  "error": "Unauthorized",
  "message": "User not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "Failed to authenticate token"
}
```

#### Examples

**cURL:**
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**JavaScript (fetch):**
```javascript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:3000/api/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();

if (response.ok) {
  console.log('Current user:', data.user);
} else {
  console.error('Failed to get user:', data);
  // Token might be expired, redirect to login
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
  }
}
```

**TypeScript:**
```typescript
interface MeResponse {
  user: {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
  };
}

const getMe = async (token: string): Promise<MeResponse> => {
  const response = await fetch('http://localhost:3000/api/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user: ${response.statusText}`);
  }

  return response.json();
};
```

---

## Error Handling

All endpoints follow a consistent error response format:

```typescript
interface ErrorResponse {
  error: string;          // Error type/category
  message: string;        // Human-readable error message
}

// For validation errors
interface ValidationErrorResponse {
  errors: Array<{
    field: string;        // Field that failed validation
    message: string;      // Validation error message
  }>;
}
```

### Common HTTP Status Codes

| Code | Meaning | When It Occurs |
|------|---------|----------------|
| 200 | OK | Successful GET request |
| 201 | Created | Successful POST request (registration) |
| 400 | Bad Request | Invalid input/validation error |
| 401 | Unauthorized | Missing, invalid, or expired token |
| 409 | Conflict | Resource already exists (duplicate email) |
| 500 | Internal Server Error | Unexpected server error |

---

## Security

### Password Requirements

Passwords must meet the following criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

**Note:** Passwords are automatically hashed using bcrypt with a cost factor of 10 before being stored in the database.

### Token Security

**Storage:**
- Store tokens securely (e.g., in `localStorage` or `sessionStorage` for web apps)
- Never store tokens in cookies without proper security flags (HttpOnly, Secure, SameSite)
- Never expose tokens in URLs or logs

**Transmission:**
- Always use HTTPS in production to prevent token interception
- Include tokens in the `Authorization` header with the `Bearer` scheme

**Expiration:**
- Tokens expire after the configured duration (default: 7 days)
- Set `JWT_EXPIRES_IN` environment variable to customize (e.g., `7d`, `24h`, `3600s`)

**Best Practices:**
```javascript
// ✅ Good: Store token securely
localStorage.setItem('token', data.token);

// ❌ Bad: Don't include token in URL
// fetch(`/api/data?token=${token}`)

// ✅ Good: Send token in Authorization header
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// ✅ Good: Handle token expiration gracefully
if (response.status === 401) {
  localStorage.removeItem('token');
  redirectToLogin();
}
```

### Rate Limiting

**Recommendation:** Implement rate limiting on authentication endpoints to prevent brute-force attacks:
- Register: 5 requests per 15 minutes per IP
- Login: 5 failed attempts per 15 minutes per IP

### CORS Configuration

The API accepts requests from origins specified in the `CORS_ORIGIN` environment variable (default: `http://localhost:3000`).

### Environment Variables

Required for authentication:
```bash
JWT_SECRET=your-super-secret-key-here-min-32-chars
JWT_EXPIRES_IN=7d                 # Optional, defaults to 7 days
CORS_ORIGIN=http://localhost:3000 # Optional, defaults to localhost:3000
```

**⚠️ Important:** In production, use a strong, randomly generated `JWT_SECRET` (minimum 32 characters).
