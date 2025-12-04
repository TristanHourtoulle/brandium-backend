import request from 'supertest';
import app from '../../src/app';
import { Model, ModelStatic } from 'sequelize';
import { User } from '../../src/models';
import {
  TestContext,
  createTestUser,
  authRequest,
  unauthRequest,
  expectations,
  FAKE_UUID,
  INVALID_UUID,
} from './testHelpers';

/**
 * Configuration for CRUD test factory
 */
export interface CRUDTestConfig<T extends Model> {
  /** API endpoint path (e.g., '/api/profiles') */
  endpoint: string;
  /** Resource name for messages (e.g., 'Profile') */
  resourceName: string;
  /** Sequelize model class */
  model: ModelStatic<T>;
  /** Valid data for creating a resource */
  validCreateData: Record<string, unknown>;
  /** Valid data for updating a resource */
  validUpdateData: Record<string, unknown>;
  /** Invalid data for testing validation (missing required fields) */
  invalidCreateData?: Record<string, unknown>;
  /** Fields unique to this resource to verify after creation */
  fieldsToVerify?: string[];
  /** Create a resource directly in DB for testing */
  createInDb: (userId: string) => Promise<T>;
}

/**
 * Generate common CRUD authentication tests
 */
export function generateAuthTests<T extends Model>(config: CRUDTestConfig<T>) {
  const { endpoint, model } = config;

  return () => {
    let ctx: TestContext;
    let resourceId: string;

    beforeEach(async () => {
      ctx = await createTestUser();
      const resource = await config.createInDb(ctx.user.id);
      resourceId = (resource as unknown as { id: string }).id;
    });

    it('should return 401 for GET list without token', async () => {
      const res = await unauthRequest('get', endpoint).expect(401);
      expectations.unauthorized(res);
    });

    it('should return 401 for GET single without token', async () => {
      const res = await unauthRequest('get', `${endpoint}/${resourceId}`).expect(401);
      expectations.unauthorized(res);
    });

    it('should return 401 for POST without token', async () => {
      const res = await unauthRequest('post', endpoint, config.validCreateData).expect(401);
      expectations.unauthorized(res);
    });

    it('should return 401 for PUT without token', async () => {
      const res = await unauthRequest('put', `${endpoint}/${resourceId}`, config.validUpdateData).expect(401);
      expectations.unauthorized(res);
    });

    it('should return 401 for DELETE without token', async () => {
      const res = await unauthRequest('delete', `${endpoint}/${resourceId}`).expect(401);
      expectations.unauthorized(res);
    });

    it('should return 401 for invalid token', async () => {
      const res = await request(app)
        .get(endpoint)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      expectations.unauthorized(res);
    });
  };
}

/**
 * Generate common CRUD GET tests
 */
export function generateGetTests<T extends Model>(config: CRUDTestConfig<T>) {
  const { endpoint, resourceName } = config;

  return () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await createTestUser();
    });

    it('should return empty array when no resources exist', async () => {
      const res = await authRequest('get', endpoint, ctx.token).expect(200);
      expectations.list(res, 0);
    });

    it('should return all resources for authenticated user', async () => {
      await config.createInDb(ctx.user.id);
      await config.createInDb(ctx.user.id);

      const res = await authRequest('get', endpoint, ctx.token).expect(200);
      expectations.list(res, 2);
    });

    it('should not return resources from other users', async () => {
      // Create resource for current user
      await config.createInDb(ctx.user.id);

      // Create another user and their resource
      const otherCtx = await createTestUser('other@example.com');
      await config.createInDb(otherCtx.user.id);

      const res = await authRequest('get', endpoint, ctx.token).expect(200);
      expectations.list(res, 1);
    });
  };
}

/**
 * Generate common CRUD GET by ID tests
 */
export function generateGetByIdTests<T extends Model>(config: CRUDTestConfig<T>) {
  const { endpoint, resourceName } = config;

  return () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await createTestUser();
    });

    it('should return a resource by ID', async () => {
      const resource = await config.createInDb(ctx.user.id);
      const resourceId = (resource as unknown as { id: string }).id;

      const res = await authRequest('get', `${endpoint}/${resourceId}`, ctx.token).expect(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.id).toBe(resourceId);
    });

    it('should return 404 for non-existent resource', async () => {
      const res = await authRequest('get', `${endpoint}/${FAKE_UUID}`, ctx.token).expect(404);
      expectations.notFound(res, resourceName);
    });

    it('should return 404 for resource owned by another user', async () => {
      const otherCtx = await createTestUser('other@example.com');
      const otherResource = await config.createInDb(otherCtx.user.id);
      const resourceId = (otherResource as unknown as { id: string }).id;

      const res = await authRequest('get', `${endpoint}/${resourceId}`, ctx.token).expect(404);
      expectations.notFound(res, resourceName);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await authRequest('get', `${endpoint}/${INVALID_UUID}`, ctx.token).expect(400);
      expectations.validationError(res);
    });
  };
}

/**
 * Generate common CRUD POST tests
 */
export function generateCreateTests<T extends Model>(config: CRUDTestConfig<T>) {
  const { endpoint, resourceName, validCreateData, invalidCreateData } = config;

  return () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await createTestUser();
    });

    it('should create a new resource with valid data', async () => {
      const res = await authRequest('post', endpoint, ctx.token, validCreateData).expect(201);
      expectations.created(res, resourceName);

      // Verify the created resource has correct data
      for (const [key, value] of Object.entries(validCreateData)) {
        if (Array.isArray(value)) {
          expect(res.body.data[key]).toEqual(value);
        } else {
          expect(res.body.data[key]).toBe(value);
        }
      }
    });

    if (invalidCreateData) {
      it('should return 400 for invalid data', async () => {
        const res = await authRequest('post', endpoint, ctx.token, invalidCreateData).expect(400);
        expectations.validationError(res);
      });
    }
  };
}

/**
 * Generate common CRUD PUT tests
 */
export function generateUpdateTests<T extends Model>(config: CRUDTestConfig<T>) {
  const { endpoint, resourceName, validUpdateData } = config;

  return () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await createTestUser();
    });

    it('should update a resource with valid data', async () => {
      const resource = await config.createInDb(ctx.user.id);
      const resourceId = (resource as unknown as { id: string }).id;

      const res = await authRequest('put', `${endpoint}/${resourceId}`, ctx.token, validUpdateData).expect(200);
      expectations.updated(res, resourceName);

      // Verify the updated resource has correct data
      for (const [key, value] of Object.entries(validUpdateData)) {
        if (Array.isArray(value)) {
          expect(res.body.data[key]).toEqual(value);
        } else {
          expect(res.body.data[key]).toBe(value);
        }
      }
    });

    it('should return 404 for non-existent resource', async () => {
      const res = await authRequest('put', `${endpoint}/${FAKE_UUID}`, ctx.token, validUpdateData).expect(404);
      expectations.notFound(res, resourceName);
    });

    it('should return 404 when updating another user resource', async () => {
      const otherCtx = await createTestUser('other@example.com');
      const otherResource = await config.createInDb(otherCtx.user.id);
      const resourceId = (otherResource as unknown as { id: string }).id;

      const res = await authRequest('put', `${endpoint}/${resourceId}`, ctx.token, validUpdateData).expect(404);
      expectations.notFound(res, resourceName);
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await authRequest('put', `${endpoint}/${INVALID_UUID}`, ctx.token, validUpdateData).expect(400);
      expectations.validationError(res);
    });
  };
}

/**
 * Generate common CRUD DELETE tests
 */
export function generateDeleteTests<T extends Model>(config: CRUDTestConfig<T>) {
  const { endpoint, resourceName, model } = config;

  return () => {
    let ctx: TestContext;

    beforeEach(async () => {
      ctx = await createTestUser();
    });

    it('should delete a resource', async () => {
      const resource = await config.createInDb(ctx.user.id);
      const resourceId = (resource as unknown as { id: string }).id;

      const res = await authRequest('delete', `${endpoint}/${resourceId}`, ctx.token).expect(200);
      expectations.deleted(res, resourceName);

      // Verify it's deleted
      const deleted = await model.findByPk(resourceId);
      expect(deleted).toBeNull();
    });

    it('should return 404 for non-existent resource', async () => {
      const res = await authRequest('delete', `${endpoint}/${FAKE_UUID}`, ctx.token).expect(404);
      expectations.notFound(res, resourceName);
    });

    it('should return 404 when deleting another user resource', async () => {
      const otherCtx = await createTestUser('other@example.com');
      const otherResource = await config.createInDb(otherCtx.user.id);
      const resourceId = (otherResource as unknown as { id: string }).id;

      await authRequest('delete', `${endpoint}/${resourceId}`, ctx.token).expect(404);

      // Verify it's NOT deleted
      const stillExists = await model.findByPk(resourceId);
      expect(stillExists).not.toBeNull();
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await authRequest('delete', `${endpoint}/${INVALID_UUID}`, ctx.token).expect(400);
      expectations.validationError(res);
    });
  };
}

/**
 * Generate all common CRUD tests for a resource
 */
export function generateCRUDTests<T extends Model>(config: CRUDTestConfig<T>) {
  return {
    authTests: generateAuthTests(config),
    getTests: generateGetTests(config),
    getByIdTests: generateGetByIdTests(config),
    createTests: generateCreateTests(config),
    updateTests: generateUpdateTests(config),
    deleteTests: generateDeleteTests(config),
  };
}
