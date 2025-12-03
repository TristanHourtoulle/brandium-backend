import request from 'supertest';
import app from '../../src/app';
import { sequelize, User } from '../../src/models';

describe('Auth API', () => {
  // =====================================
  // Setup and Teardown
  // =====================================
  beforeAll(async () => {
    // Sync database (create tables if not exist)
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Clean up and close connection
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear users table before each test
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  // =====================================
  // POST /api/auth/register Tests
  // =====================================
  describe('POST /api/auth/register', () => {
    describe('Success Cases', () => {
      it('should register a new user and return JWT token', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          })
          .expect(201);

        expect(res.body).toHaveProperty('message', 'User registered successfully');
        expect(res.body).toHaveProperty('user');
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
        expect(res.body.user).toHaveProperty('createdAt');
        expect(res.body.user).toHaveProperty('updatedAt');
        // Password should NOT be in the response
        expect(res.body.user).not.toHaveProperty('passwordHash');
        expect(res.body.user).not.toHaveProperty('password');
        // Token should be a valid JWT format
        expect(res.body.token).toMatch(/^eyJ/);
      });

      it('should normalize email to lowercase', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'TEST@EXAMPLE.COM',
            password: 'Password123',
          })
          .expect(201);

        expect(res.body.user.email).toBe('test@example.com');
      });

      it('should hash the password in the database', async () => {
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          })
          .expect(201);

        // Verify password is hashed in DB
        const user = await User.findOne({ where: { email: 'test@example.com' } });
        expect(user).not.toBeNull();
        expect(user!.passwordHash).not.toBe('Password123');
        expect(user!.passwordHash).toMatch(/^\$2[aby]\$/); // bcrypt hash format
      });
    });

    describe('Email Validation Errors', () => {
      it('should return 400 for invalid email format', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            password: 'Password123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
        expect(res.body.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: 'email',
              msg: 'Email must be valid',
            }),
          ]),
        );
      });

      it('should return 400 for missing email', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'Password123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
        expect(res.body.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: 'email',
            }),
          ]),
        );
      });

      it('should return 400 for empty email', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: '',
            password: 'Password123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for email without domain', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@',
            password: 'Password123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });
    });

    describe('Password Validation Errors', () => {
      it('should return 400 for password less than 8 characters', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Pass1',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
        expect(res.body.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: 'password',
              msg: 'Password must be at least 8 characters long',
            }),
          ]),
        );
      });

      it('should return 400 for password without uppercase letter', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'password123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
        expect(res.body.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: 'password',
              msg: 'Password must contain at least one uppercase, one lowercase, and one number',
            }),
          ]),
        );
      });

      it('should return 400 for password without lowercase letter', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'PASSWORD123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for password without number', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'PasswordABC',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for missing password', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for empty password', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: '',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });
    });

    describe('Duplicate Email Error', () => {
      it('should return 409 if email already exists', async () => {
        // First registration
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          })
          .expect(201);

        // Second registration with same email
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password456',
          })
          .expect(409);

        expect(res.body).toHaveProperty('error', 'Conflict');
        expect(res.body).toHaveProperty('message', 'User already exists with this email');
      });

      it('should return 409 for same email with different case', async () => {
        // First registration
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          })
          .expect(201);

        // Second registration with same email in uppercase
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'TEST@EXAMPLE.COM',
            password: 'Password456',
          })
          .expect(409);

        expect(res.body).toHaveProperty('error', 'Conflict');
      });
    });

    describe('Edge Cases', () => {
      it('should return 400 for empty body', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({})
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for non-JSON body', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .set('Content-Type', 'application/json')
          .send('not json')
          .expect(400);

        // Express should reject malformed JSON
        expect(res.status).toBe(400);
      });

      it('should handle special characters in password', async () => {
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'Password123!@#$%',
          })
          .expect(201);

        expect(res.body).toHaveProperty('message', 'User registered successfully');
      });

      it('should handle long email addresses', async () => {
        const longLocalPart = 'a'.repeat(64);
        const res = await request(app)
          .post('/api/auth/register')
          .send({
            email: `${longLocalPart}@example.com`,
            password: 'Password123',
          })
          .expect(201);

        expect(res.body).toHaveProperty('message', 'User registered successfully');
      });
    });
  });

  // =====================================
  // POST /api/auth/login Tests
  // =====================================
  describe('POST /api/auth/login', () => {
    // Create a test user before login tests
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });
    });

    describe('Success Cases', () => {
      it('should login successfully with correct credentials', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          })
          .expect(200);

        expect(res.body).toHaveProperty('message', 'Login successful');
        expect(res.body).toHaveProperty('user');
        expect(res.body).toHaveProperty('token');
        expect(res.body.user).toHaveProperty('id');
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
        // Password should NOT be in the response
        expect(res.body.user).not.toHaveProperty('passwordHash');
        expect(res.body.user).not.toHaveProperty('password');
        // Token should be a valid JWT format
        expect(res.body.token).toMatch(/^eyJ/);
      });

      it('should login with email in different case', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'TEST@EXAMPLE.COM',
            password: 'Password123',
          })
          .expect(200);

        expect(res.body).toHaveProperty('message', 'Login successful');
      });

      it('should return different tokens on multiple logins', async () => {
        const res1 = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          });

        // Wait a bit to ensure different iat (issued at)
        await new Promise((resolve) => setTimeout(resolve, 1100));

        const res2 = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          });

        // Tokens should be different due to different iat
        expect(res1.body.token).not.toBe(res2.body.token);
      });
    });

    describe('Authentication Errors', () => {
      it('should return 401 for wrong password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123',
          })
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
        expect(res.body).toHaveProperty('message', 'Invalid email or password');
      });

      it('should return 401 for non-existent user', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Password123',
          })
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
        expect(res.body).toHaveProperty('message', 'Invalid email or password');
      });

      it('should not reveal if email exists or not (security)', async () => {
        // Both should return the same generic message
        const resWrongEmail = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'Password123',
          })
          .expect(401);

        const resWrongPassword = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'WrongPassword123',
          })
          .expect(401);

        expect(resWrongEmail.body.message).toBe(resWrongPassword.body.message);
        expect(resWrongEmail.body.message).toBe('Invalid email or password');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 for invalid email format', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'invalid-email',
            password: 'Password123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for missing email', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            password: 'Password123',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for missing password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
        expect(res.body.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: 'password',
              msg: 'Password is required',
            }),
          ]),
        );
      });

      it('should return 400 for empty password', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: '',
          })
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });

      it('should return 400 for empty body', async () => {
        const res = await request(app)
          .post('/api/auth/login')
          .send({})
          .expect(400);

        expect(res.body).toHaveProperty('error', 'Validation Error');
      });
    });
  });

  // =====================================
  // GET /api/auth/me Tests
  // =====================================
  describe('GET /api/auth/me', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register and get token
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      validToken = res.body.token;
      userId = res.body.user.id;
    });

    describe('Success Cases', () => {
      it('should return user info with valid token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toHaveProperty('id', userId);
        expect(res.body.user).toHaveProperty('email', 'test@example.com');
        expect(res.body.user).toHaveProperty('createdAt');
        expect(res.body.user).toHaveProperty('updatedAt');
        // Password should NOT be in the response
        expect(res.body.user).not.toHaveProperty('passwordHash');
        expect(res.body.user).not.toHaveProperty('password');
      });

      it('should work with token from login', async () => {
        // Get a new token via login
        const loginRes = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: 'Password123',
          });

        const loginToken = loginRes.body.token;

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${loginToken}`)
          .expect(200);

        expect(res.body.user).toHaveProperty('email', 'test@example.com');
      });
    });

    describe('Authorization Errors', () => {
      it('should return 401 without Authorization header', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
        expect(res.body).toHaveProperty('message', 'No token provided or invalid format');
      });

      it('should return 401 with empty Authorization header', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', '')
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 401 without Bearer prefix', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', validToken)
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
        expect(res.body).toHaveProperty('message', 'No token provided or invalid format');
      });

      it('should return 401 with invalid Bearer format', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer')
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 401 with malformed token', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', 'Bearer invalid_token')
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
        expect(res.body).toHaveProperty('message', 'Invalid token');
      });

      it('should return 401 with tampered token', async () => {
        // Modify the token to make it invalid
        const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
        expect(res.body).toHaveProperty('message', 'Invalid token');
      });

      it('should return 401 with token signed with wrong secret', async () => {
        // Create a token with wrong secret (simulated by using a completely different token)
        const wrongSecretToken =
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3OCIsImlhdCI6MTUxNjIzOTAyMn0.wrongsignature';

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${wrongSecretToken}`)
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should return 401 if user was deleted after token issued', async () => {
        // Delete the user
        await User.destroy({ where: { id: userId } });

        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
        expect(res.body).toHaveProperty('message', 'User not found');
      });
    });

    describe('Edge Cases', () => {
      it('should handle lowercase bearer', async () => {
        // Some implementations may require "bearer" lowercase
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `bearer ${validToken}`)
          .expect(401); // Our implementation requires "Bearer" with capital B

        expect(res.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should handle extra spaces in Authorization header', async () => {
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer  ${validToken}`)
          .expect(401);

        expect(res.body).toHaveProperty('error', 'Unauthorized');
      });

      it('should handle trailing whitespace in token (trimmed by http parsers)', async () => {
        // Note: Trailing whitespace is typically trimmed by HTTP parsers
        // so this test verifies the token still works
        const res = await request(app)
          .get('/api/auth/me')
          .set('Authorization', `Bearer ${validToken} `)
          .expect(200);

        expect(res.body).toHaveProperty('user');
      });
    });
  });

  // =====================================
  // Integration Flow Tests
  // =====================================
  describe('Full Authentication Flow', () => {
    it('should complete full auth flow: register -> login -> access protected route', async () => {
      // Step 1: Register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'flowtest@example.com',
          password: 'Password123',
        })
        .expect(201);

      expect(registerRes.body.user.email).toBe('flowtest@example.com');
      const registerToken = registerRes.body.token;

      // Step 2: Access protected route with register token
      const meRes1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registerToken}`)
        .expect(200);

      expect(meRes1.body.user.email).toBe('flowtest@example.com');

      // Step 3: Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'flowtest@example.com',
          password: 'Password123',
        })
        .expect(200);

      expect(loginRes.body.user.email).toBe('flowtest@example.com');
      const loginToken = loginRes.body.token;

      // Step 4: Access protected route with login token
      const meRes2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginToken}`)
        .expect(200);

      expect(meRes2.body.user.email).toBe('flowtest@example.com');

      // Both tokens should refer to the same user
      expect(meRes1.body.user.id).toBe(meRes2.body.user.id);
    });

    it('should handle multiple users correctly', async () => {
      // Register user 1
      const res1 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'Password123',
        })
        .expect(201);

      // Register user 2
      const res2 = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'Password456',
        })
        .expect(201);

      // Verify user 1's token returns user 1's data
      const me1 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${res1.body.token}`)
        .expect(200);

      expect(me1.body.user.email).toBe('user1@example.com');

      // Verify user 2's token returns user 2's data
      const me2 = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${res2.body.token}`)
        .expect(200);

      expect(me2.body.user.email).toBe('user2@example.com');

      // Users should have different IDs
      expect(me1.body.user.id).not.toBe(me2.body.user.id);
    });
  });
});
