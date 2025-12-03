import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import { sequelize, User } from '../../src/models';

describe('AuthMiddleware Unit Tests', () => {
  const originalJwtSecret = process.env.JWT_SECRET;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    process.env.JWT_SECRET = originalJwtSecret;
    await sequelize.close();
  });

  beforeEach(async () => {
    process.env.JWT_SECRET = originalJwtSecret;
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  // =====================================
  // Token Format Tests
  // =====================================
  describe('Token Format Validation', () => {
    it('should return 401 for Authorization header without Bearer prefix', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'some-token')
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body).toHaveProperty('message', 'No token provided or invalid format');
    });

    it('should return 401 for Authorization header with only "Bearer" (no space)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer')
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
      // "Bearer" without space doesn't match "Bearer " so it fails the format check
      expect(res.body).toHaveProperty('message', 'No token provided or invalid format');
    });

    it('should return 401 for Authorization header "Bearer " (trailing space trimmed by HTTP)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
      // HTTP parsers trim trailing whitespace, so "Bearer " becomes "Bearer"
      // which fails the startsWith('Bearer ') check
      expect(res.body).toHaveProperty('message', 'No token provided or invalid format');
    });
  });

  // =====================================
  // JWT Verification Errors
  // =====================================
  describe('JWT Verification Errors', () => {
    it('should return 401 for malformed JWT token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt')
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body).toHaveProperty('message', 'Invalid token');
    });

    it('should return 401 for JWT with invalid signature', async () => {
      // Create a token with a different secret
      const fakeToken = jwt.sign({ userId: 'some-id' }, 'wrong-secret', {
        expiresIn: '1h',
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body).toHaveProperty('message', 'Invalid token');
    });

    it('should return 401 for expired JWT token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: 'some-id' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }, // Already expired
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body).toHaveProperty('message', 'Token expired');
    });

    it('should return 401 for JWT with non-existent user', async () => {
      // Create a valid token but for a non-existent user
      const tokenForNonExistentUser = jwt.sign(
        { userId: '00000000-0000-0000-0000-000000000000' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' },
      );

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenForNonExistentUser}`)
        .expect(401);

      expect(res.body).toHaveProperty('error', 'Unauthorized');
      expect(res.body).toHaveProperty('message', 'User not found');
    });
  });

  // =====================================
  // JWT_SECRET Missing Tests
  // =====================================
  describe('JWT_SECRET Configuration', () => {
    it('should return 500 when JWT_SECRET is not defined', async () => {
      // Register a user first
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      const validToken = registerRes.body.token;

      // Now remove JWT_SECRET
      delete process.env.JWT_SECRET;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(500);

      expect(res.body).toHaveProperty('error', 'Internal Server Error');
      expect(res.body).toHaveProperty('message', 'Server configuration error');
    });
  });

  // =====================================
  // Valid Token Tests
  // =====================================
  describe('Valid Token Processing', () => {
    it('should successfully authenticate with valid token', async () => {
      // Register a user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      const token = registerRes.body.token;
      const userId = registerRes.body.user.id;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.user).toHaveProperty('id', userId);
      expect(res.body.user).toHaveProperty('email', 'test@example.com');
    });

    it('should attach user to request after successful authentication', async () => {
      // Register a user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123',
        });

      const token = registerRes.body.token;

      // Access protected route
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // User should be properly attached and serialized (no passwordHash)
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('id');
    });
  });
});
