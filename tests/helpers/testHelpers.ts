import request from 'supertest';
import app from '../../src/app';
import { sequelize, User } from '../../src/models';
import { Model, ModelStatic } from 'sequelize';

/**
 * Test context interface returned by setupTestContext
 */
export interface TestContext {
  user: User;
  token: string;
}

/**
 * Create a test user and return the user and auth token
 * @param email - Email for the test user (default: 'test@example.com')
 * @param password - Password for the test user (default: 'Password123')
 */
export async function createTestUser(
  email: string = 'test@example.com',
  password: string = 'Password123',
): Promise<TestContext> {
  const res = await request(app).post('/api/auth/register').send({
    email,
    password,
  });

  const user = (await User.findOne({ where: { email } })) as User;

  return {
    user,
    token: res.body.token,
  };
}

/**
 * Standard database setup for tests
 */
export async function setupDatabase(): Promise<void> {
  await sequelize.sync({ force: true });
}

/**
 * Standard database cleanup
 */
export async function cleanupDatabase(): Promise<void> {
  await sequelize.close();
}

/**
 * Clear all data from specified models
 * @param models - Array of Sequelize models to clear
 */
export async function clearModels(models: ModelStatic<Model>[]): Promise<void> {
  for (const model of models) {
    await model.destroy({ where: {}, truncate: true, cascade: true });
  }
}

/**
 * Make an authenticated request
 * @param method - HTTP method
 * @param path - API path
 * @param token - Auth token
 * @param body - Optional request body
 */
export function authRequest(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  token: string,
  body?: Record<string, unknown>,
) {
  const req = request(app)[method](path).set('Authorization', `Bearer ${token}`);
  if (body) {
    return req.send(body);
  }
  return req;
}

/**
 * Make an unauthenticated request (for testing 401 responses)
 * @param method - HTTP method
 * @param path - API path
 * @param body - Optional request body
 */
export function unauthRequest(
  method: 'get' | 'post' | 'put' | 'delete',
  path: string,
  body?: Record<string, unknown>,
) {
  const req = request(app)[method](path);
  if (body) {
    return req.send(body);
  }
  return req;
}

/**
 * Standard CRUD test expectations
 */
export const expectations = {
  /**
   * Check list response format
   */
  list: (res: request.Response, count: number) => {
    expect(res.body).toHaveProperty('count', count);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(count);
  },

  /**
   * Check single resource response format
   */
  single: (res: request.Response, expectedFields?: Record<string, unknown>) => {
    expect(res.body).toHaveProperty('data');
    if (expectedFields) {
      for (const [key, value] of Object.entries(expectedFields)) {
        expect(res.body.data[key]).toEqual(value);
      }
    }
  },

  /**
   * Check created response format
   */
  created: (res: request.Response, resourceName: string) => {
    expect(res.body).toHaveProperty('message', `${resourceName} created successfully`);
    expect(res.body).toHaveProperty('data');
  },

  /**
   * Check updated response format
   */
  updated: (res: request.Response, resourceName: string) => {
    expect(res.body).toHaveProperty('message', `${resourceName} updated successfully`);
    expect(res.body).toHaveProperty('data');
  },

  /**
   * Check deleted response format
   */
  deleted: (res: request.Response, resourceName: string) => {
    expect(res.body).toHaveProperty('message', `${resourceName} deleted successfully`);
  },

  /**
   * Check 404 Not Found response
   */
  notFound: (res: request.Response, resourceName: string) => {
    expect(res.body).toHaveProperty('error', 'Not Found');
    expect(res.body).toHaveProperty('message', `${resourceName} not found`);
  },

  /**
   * Check 401 Unauthorized response
   */
  unauthorized: (res: request.Response) => {
    expect(res.body).toHaveProperty('error', 'Unauthorized');
  },

  /**
   * Check 400 Validation Error response
   */
  validationError: (res: request.Response) => {
    expect(res.body).toHaveProperty('error', 'Validation Error');
  },
};

/**
 * Fake UUID for testing non-existent resources
 */
export const FAKE_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Invalid UUID for testing validation
 */
export const INVALID_UUID = 'invalid-uuid';
