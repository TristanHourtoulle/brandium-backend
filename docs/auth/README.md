# Authentication Documentation

Complete documentation for the Brandium authentication system.

## 📚 Documentation Index

| Document | Description |
|----------|-------------|
| **[API.md](./API.md)** | Complete API reference for all authentication endpoints |
| **[MIDDLEWARE.md](./MIDDLEWARE.md)** | Documentation for JWT middleware and validators |
| **[EXAMPLES.md](./EXAMPLES.md)** | Real-world integration examples and code samples |

---

## 🚀 Quick Start

### 1. Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"SecurePass123"}'
```

### 3. Access Protected Route

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📖 Overview

The Brandium authentication system provides secure user authentication using JSON Web Tokens (JWT). It consists of three main endpoints:

### Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Login and receive JWT token | No |
| `GET` | `/api/auth/me` | Get current user information | Yes |

### Authentication Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Client  │                │   API   │                │ Database │
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │  POST /auth/register     │                           │
     ├─────────────────────────>│  Create user              │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │  201 Created             │                           │
     │  { user, token }         │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
     │  GET /auth/me            │                           │
     │  Bearer <token>          │                           │
     ├─────────────────────────>│  Verify JWT               │
     │                          │  Fetch user               │
     │                          ├──────────────────────────>│
     │                          │<──────────────────────────┤
     │  200 OK                  │                           │
     │  { user }                │                           │
     │<─────────────────────────┤                           │
     │                          │                           │
```

---

## 🔑 Key Features

### Security

- **Password Hashing**: Passwords are hashed using bcrypt with a cost factor of 10
- **JWT Authentication**: Stateless authentication using JSON Web Tokens
- **Token Expiration**: Configurable token expiration (default: 7 days)
- **Secure Token Storage**: Tokens are signed with a secret key
- **Input Validation**: Comprehensive request validation

### Validation Rules

**Email:**
- Must be valid email format
- Required for all auth operations

**Password (Registration):**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

---

## 🛠️ Implementation

### Using in Routes

```typescript
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware';

const router = Router();

// Public route
router.get('/public', (req, res) => {
  res.json({ message: 'Public data' });
});

// Protected route
router.get('/protected', authMiddleware, (req, res) => {
  // req.user is available here
  res.json({
    message: 'Protected data',
    userId: req.user.id
  });
});

export default router;
```

### Frontend Integration

```typescript
// Login
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const { token, user } = await response.json();

// Store token
localStorage.setItem('token', token);

// Use token in subsequent requests
const protectedResponse = await fetch('http://localhost:3000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  },
});
```

---

## 📋 API Reference Summary

### POST /api/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**See:** [API.md#post-apiauthregister](./API.md#post-apiauthregister)

---

### POST /api/auth/login

Authenticate an existing user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**See:** [API.md#post-apiauthlogin](./API.md#post-apiauthlogin)

---

### GET /api/auth/me

Get current authenticated user (protected route).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200):**
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

**See:** [API.md#get-apiauthme](./API.md#get-apiauthme)

---

## 🔐 Middleware

### authMiddleware

JWT verification middleware for protecting routes.

**Usage:**
```typescript
import authMiddleware from '../middleware/authMiddleware';

router.get('/protected', authMiddleware, handler);
```

**What it does:**
1. Extracts token from `Authorization` header
2. Verifies JWT signature and expiration
3. Fetches user from database
4. Attaches user to `req.user`

**See:** [MIDDLEWARE.md#authmiddleware](./MIDDLEWARE.md#authmiddleware)

---

### authValidators

Request validation middleware for auth endpoints.

**Usage:**
```typescript
import { authValidators } from '../middleware/validators';

router.post('/register', authValidators.register, handler);
router.post('/login', authValidators.login, handler);
```

**See:** [MIDDLEWARE.md#auth-validators](./MIDDLEWARE.md#auth-validators)

---

## 💡 Examples

### React Integration

Full React authentication with context, hooks, and protected routes.

**See:** [EXAMPLES.md#react](./EXAMPLES.md#react)

### Vue.js Integration

Vue 3 Composition API with Pinia store.

**See:** [EXAMPLES.md#vuejs](./EXAMPLES.md#vuejs)

### Node.js Client

Server-to-server authentication client.

**See:** [EXAMPLES.md#nodejs-client](./EXAMPLES.md#nodejs-client)

### Python Client

Python client for Brandium API.

**See:** [EXAMPLES.md#python-client](./EXAMPLES.md#python-client)

### Advanced Patterns

- Token refresh strategies
- Axios interceptors
- Comprehensive error handling

**See:** [EXAMPLES.md#advanced-patterns](./EXAMPLES.md#advanced-patterns)

---

## ⚙️ Configuration

### Required Environment Variables

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-here-min-32-chars  # Required
JWT_EXPIRES_IN=7d                                    # Optional (default: 7d)

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=brandium
DB_USER=postgres
DB_PASSWORD=your-password

# CORS Configuration
CORS_ORIGIN=http://localhost:3000                    # Optional
```

### JWT Token Expiration

Configure token expiration using `JWT_EXPIRES_IN`:

```bash
JWT_EXPIRES_IN=7d      # 7 days
JWT_EXPIRES_IN=24h     # 24 hours
JWT_EXPIRES_IN=3600s   # 3600 seconds
JWT_EXPIRES_IN=3600    # 3600 seconds (numeric)
```

**Default:** 7 days if not specified

---

## 🔍 Error Handling

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Successful request |
| `201` | Created | User registered successfully |
| `400` | Bad Request | Invalid input/validation error |
| `401` | Unauthorized | Missing, invalid, or expired token |
| `409` | Conflict | Email already exists |
| `500` | Internal Server Error | Unexpected server error |

### Error Response Format

```json
{
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

**See:** [API.md#error-handling](./API.md#error-handling)

---

## 🧪 Testing

### Running Tests

```bash
# Run all auth tests
npm test -- auth

# Run with coverage
npm run test:coverage
```

### Example Test

```typescript
import request from 'supertest';
import app from '../src/app';

describe('Authentication', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'TestPass123',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
  });
});
```

**See:** [EXAMPLES.md#testing](./EXAMPLES.md#testing)

---

## 🛡️ Security Best Practices

### Server-Side

- ✅ Always use strong `JWT_SECRET` (minimum 32 characters)
- ✅ Use HTTPS in production
- ✅ Implement rate limiting on auth endpoints
- ✅ Never log sensitive data (passwords, tokens)
- ✅ Validate all inputs
- ✅ Use environment variables for secrets

### Client-Side

- ✅ Store tokens securely (localStorage or sessionStorage)
- ✅ Never include tokens in URLs
- ✅ Always use HTTPS in production
- ✅ Handle token expiration gracefully
- ✅ Clear tokens on logout
- ✅ Validate user input before sending

**See:** [API.md#security](./API.md#security)

---

## 📝 Source Code

### File Locations

```
src/
├── routes/
│   └── auth.ts                    # Route definitions
├── controllers/
│   └── AuthController.ts          # Auth handlers
├── middleware/
│   ├── authMiddleware.ts          # JWT verification
│   └── validators.ts              # Input validation
└── models/
    └── User.ts                    # User model
```

### Key Files

- **Routes:** [src/routes/auth.ts](../../src/routes/auth.ts)
- **Controller:** [src/controllers/AuthController.ts](../../src/controllers/AuthController.ts)
- **Middleware:** [src/middleware/authMiddleware.ts](../../src/middleware/authMiddleware.ts)

---

## 🔗 Related Documentation

- [Main README](../../README.md) - Project overview and setup
- [CLAUDE.md](../../CLAUDE.md) - Development guidelines
- [API Documentation](./API.md) - Complete API reference
- [Middleware Documentation](./MIDDLEWARE.md) - Middleware details
- [Examples](./EXAMPLES.md) - Integration examples

---

## 📞 Support

For issues or questions:

1. Check the [API Documentation](./API.md) for endpoint details
2. Review [Examples](./EXAMPLES.md) for integration patterns
3. Check the [Middleware Documentation](./MIDDLEWARE.md) for implementation details
4. Review test files for usage examples

---

## 📄 License

MIT License - See main [README](../../README.md) for details.

---

**Last Updated:** 2025-12-03
**Version:** 1.0.0
