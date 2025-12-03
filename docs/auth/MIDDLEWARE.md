# Authentication Middleware Documentation

Complete documentation for JWT authentication middleware and validators.

## Table of Contents

- [Overview](#overview)
- [authMiddleware](#authmiddleware)
- [Auth Validators](#auth-validators)
- [Usage Examples](#usage-examples)
- [Error Handling](#error-handling)
- [TypeScript Types](#typescript-types)

---

## Overview

The authentication system consists of two main middleware components:

1. **authMiddleware** - Verifies JWT tokens and attaches authenticated user to requests
2. **authValidators** - Validates request body for registration and login endpoints

---

## authMiddleware

JWT verification middleware that protects routes requiring authentication.

### Location
`src/middleware/authMiddleware.ts`

### Purpose
- Extracts JWT token from `Authorization` header
- Verifies token signature and expiration
- Fetches user from database
- Attaches user object to `req.user` for downstream handlers

### Implementation

```typescript
import authMiddleware from '../middleware/authMiddleware';

/**
 * Middleware to verify JWT token and attach user to request
 * Use this middleware on protected routes
 */
const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Implementation details...
};
```

### Request Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Extract Authorization header                              │
│    ↓                                                          │
│ 2. Validate Bearer token format                              │
│    ↓                                                          │
│ 3. Extract JWT token                                         │
│    ↓                                                          │
│ 4. Verify JWT signature and expiration                       │
│    ↓                                                          │
│ 5. Fetch user from database using decoded userId             │
│    ↓                                                          │
│ 6. Attach user to req.user                                   │
│    ↓                                                          │
│ 7. Call next() to continue request processing                │
└──────────────────────────────────────────────────────────────┘
```

### Expected Header Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Success Behavior

When authentication succeeds:
1. User object is attached to `req.user`
2. `next()` is called to continue request processing
3. Route handler can access `req.user` safely

```typescript
// In your route handler
router.get('/protected', authMiddleware, async (req, res) => {
  // req.user is guaranteed to exist here
  const userId = req.user.id;
  const userEmail = req.user.email;

  res.json({ message: `Hello ${userEmail}` });
});
```

### Error Responses

#### Missing or Invalid Authorization Header

**Status:** 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "No token provided or invalid format"
}
```

**Causes:**
- No `Authorization` header present
- Header doesn't start with `Bearer `

#### Missing Token

**Status:** 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Token is missing"
}
```

**Cause:** Authorization header is `Bearer ` with no token after the space

#### Invalid Token

**Status:** 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid token"
}
```

**Causes:**
- Token has been tampered with
- Token signature doesn't match
- Token format is malformed
- Token was signed with a different secret

#### Expired Token

**Status:** 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Token expired"
}
```

**Cause:** Token's expiration time (`exp` claim) has passed

**Note:** TokenExpiredError is checked BEFORE JsonWebTokenError because it extends JsonWebTokenError. This ordering is critical for proper error handling.

#### User Not Found

**Status:** 401 Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "User not found"
}
```

**Causes:**
- User was deleted after token was issued
- User ID in token doesn't exist in database

#### Server Configuration Error

**Status:** 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Server configuration error"
}
```

**Cause:** `JWT_SECRET` environment variable is not defined

#### General Authentication Failure

**Status:** 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to authenticate token"
}
```

**Cause:** Unexpected error during authentication process

### Usage in Routes

```typescript
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// Public route - no authentication required
router.get('/public', (req, res) => {
  res.json({ message: 'Public data' });
});

// Protected route - authentication required
router.get('/protected', authMiddleware, (req, res) => {
  res.json({
    message: 'Protected data',
    user: req.user
  });
});

// Multiple middleware can be chained
router.post('/admin', authMiddleware, isAdmin, (req, res) => {
  res.json({ message: 'Admin only' });
});
```

### TypeScript Type Extensions

The middleware extends the Express Request type to include the `user` property:

```typescript
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}
```

This allows TypeScript to recognize `req.user` throughout your application.

---

## Auth Validators

Request body validation middleware for authentication endpoints.

### Location
`src/middleware/validators.ts` (assuming standard structure)

### Purpose
Validates request body data before it reaches the controller handlers:
- Ensures required fields are present
- Validates email format
- Enforces password requirements
- Returns detailed validation errors

### Register Validator

Validates registration requests.

```typescript
authValidators.register
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Must be valid email format |
| password | string | Yes | Min 8 chars, 1 uppercase, 1 lowercase, 1 number |

**Example Usage:**
```typescript
router.post('/register', authValidators.register, register);
```

**Valid Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Invalid Request:**
```json
{
  "email": "not-an-email",
  "password": "weak"
}
```

**Error Response (400 Bad Request):**
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
    },
    {
      "field": "password",
      "message": "must contain at least one uppercase letter"
    },
    {
      "field": "password",
      "message": "must contain at least one number"
    }
  ]
}
```

### Login Validator

Validates login requests.

```typescript
authValidators.login
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | Yes | Must be valid email format |
| password | string | Yes | Minimum 1 character |

**Example Usage:**
```typescript
router.post('/login', authValidators.login, login);
```

**Valid Request:**
```json
{
  "email": "user@example.com",
  "password": "any-password"
}
```

**Invalid Request:**
```json
{
  "email": "not-an-email",
  "password": ""
}
```

**Error Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "field": "email",
      "message": "must be a valid email"
    },
    {
      "field": "password",
      "message": "is required"
    }
  ]
}
```

---

## Usage Examples

### Basic Protected Route

```typescript
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.get('/profile', authMiddleware, async (req, res) => {
  // req.user is available and typed
  const user = req.user!; // Non-null assertion safe here

  res.json({
    id: user.id,
    email: user.email,
  });
});

export default router;
```

### Multiple Middleware Chain

```typescript
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import { checkRole } from '../middleware/checkRole';
import { validateInput } from '../middleware/validateInput';

const router = Router();

router.post(
  '/admin/users',
  authMiddleware,           // 1. Authenticate user
  checkRole('admin'),        // 2. Verify admin role
  validateInput(userSchema), // 3. Validate request body
  async (req, res) => {      // 4. Handle request
    // All middleware passed, handle request
    res.json({ success: true });
  }
);
```

### Conditional Authentication

```typescript
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// Middleware that makes auth optional
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    // If token provided, verify it
    return authMiddleware(req, res, next);
  }

  // No token, continue without user
  next();
};

router.get('/posts', optionalAuth, async (req, res) => {
  // req.user exists if authenticated, undefined otherwise
  const userId = req.user?.id;

  if (userId) {
    // Return personalized posts
  } else {
    // Return public posts
  }
});
```

### Error Handling in Routes

```typescript
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

router.get('/data', authMiddleware, async (req, res, next) => {
  try {
    // Access user safely
    const userId = req.user!.id;

    // Your business logic here
    const data = await fetchUserData(userId);

    res.json({ data });
  } catch (error) {
    // Pass errors to error handling middleware
    next(error);
  }
});
```

### Testing Protected Routes

```typescript
import request from 'supertest';
import app from '../app';

describe('Protected Routes', () => {
  let authToken: string;

  beforeAll(async () => {
    // Register and login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'TestPass123',
      });

    authToken = response.body.token;
  });

  it('should access protected route with valid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
  });

  it('should reject request without token', async () => {
    const response = await request(app)
      .get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
  });

  it('should reject request with invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid token');
  });
});
```

---

## Error Handling

### Error Handling Order

The middleware checks errors in this specific order:

1. **TokenExpiredError** - Must be checked first (extends JsonWebTokenError)
2. **JsonWebTokenError** - Generic JWT errors
3. **Other errors** - Unexpected errors

**Critical Implementation Detail:**
```typescript
// ✅ Correct order
if (error instanceof jwt.TokenExpiredError) {
  // Handle expired token
} else if (error instanceof jwt.JsonWebTokenError) {
  // Handle invalid token
}

// ❌ Wrong order - TokenExpiredError would be caught by JsonWebTokenError
if (error instanceof jwt.JsonWebTokenError) {
  // This catches TokenExpiredError too!
} else if (error instanceof jwt.TokenExpiredError) {
  // This block never executes
}
```

### Client-Side Error Handling

```typescript
// React example
const fetchProtectedData = async () => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      // Token invalid or expired
      const data = await response.json();

      if (data.message === 'Token expired') {
        // Redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching protected data:', error);
    throw error;
  }
};
```

### Server-Side Error Logging

```typescript
const authMiddleware = async (req, res, next) => {
  try {
    // Authentication logic...
  } catch (error) {
    // Log errors for debugging (but don't expose details to client)
    console.error('Authentication error:', {
      error: error.message,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });

    // Return generic error to client
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to authenticate token',
    });
  }
};
```

---

## TypeScript Types

### Request with User

```typescript
import { Request } from 'express';
import { User } from '../models';

// Extended Request type with user
interface AuthRequest extends Request {
  user: User; // Non-optional for authenticated routes
}

// Usage in controller
export const getProfile = async (req: AuthRequest, res: Response) => {
  // TypeScript knows req.user exists
  const userId = req.user.id;
};
```

### JWT Payload

```typescript
interface JwtPayload {
  userId: string;  // User's UUID
  iat: number;     // Issued at (timestamp)
  exp: number;     // Expires at (timestamp)
}
```

### Middleware Type

```typescript
import { Request, Response, NextFunction } from 'express';

type AuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;
```

### Validator Type

```typescript
import { RequestHandler } from 'express';

interface AuthValidators {
  register: RequestHandler;
  login: RequestHandler;
}
```

---

## Best Practices

### 1. Always Handle Token Expiration Gracefully

```typescript
// ✅ Good
if (response.status === 401) {
  localStorage.removeItem('token');
  redirectToLogin();
}

// ❌ Bad
// Silently failing or not handling expired tokens
```

### 2. Use TypeScript Type Guards

```typescript
// ✅ Good
if (req.user) {
  const userId = req.user.id;
}

// ❌ Bad
const userId = req.user!.id; // Dangerous in non-auth routes
```

### 3. Validate Environment Variables on Startup

```typescript
// ✅ Good - Check in app.ts
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined');
}

// ❌ Bad - Checking during request handling
```

### 4. Use Proper HTTP Status Codes

```typescript
// ✅ Good
res.status(401).json({ message: 'Unauthorized' });  // Auth required
res.status(403).json({ message: 'Forbidden' });     // Insufficient permissions

// ❌ Bad
res.status(400).json({ message: 'Not logged in' }); // Wrong status code
```

### 5. Don't Expose Sensitive Information

```typescript
// ✅ Good
res.status(401).json({ message: 'Invalid email or password' });

// ❌ Bad - Exposes which field is wrong
res.status(401).json({ message: 'User not found' });
res.status(401).json({ message: 'Password incorrect' });
```
