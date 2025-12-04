import { Response } from 'express';
import { Model, ModelStatic } from 'sequelize';
import {
  findUserResource,
  sendNotFound,
  sendSuccess,
  sendSuccessWithMessage,
  sendList,
  buildUpdateObject,
} from '../../src/utils/controllerHelpers';

// Mock Response object
function createMockResponse(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

// Mock Model
function createMockModel<T>(findOneResult: T | null): ModelStatic<Model> {
  return {
    findOne: jest.fn().mockResolvedValue(findOneResult),
  } as unknown as ModelStatic<Model>;
}

describe('controllerHelpers', () => {
  // =====================================
  // findUserResource
  // =====================================
  describe('findUserResource', () => {
    it('should return null when id is undefined', async () => {
      const mockModel = createMockModel({ id: '123' });

      const result = await findUserResource(mockModel, undefined, 'user-123');

      expect(result).toBeNull();
      expect(mockModel.findOne).not.toHaveBeenCalled();
    });

    it('should return null when id is empty string', async () => {
      const mockModel = createMockModel({ id: '123' });

      const result = await findUserResource(mockModel, '', 'user-123');

      expect(result).toBeNull();
      expect(mockModel.findOne).not.toHaveBeenCalled();
    });

    it('should call model.findOne with correct parameters', async () => {
      const mockResource = { id: 'resource-123', userId: 'user-123' };
      const mockModel = createMockModel(mockResource);

      const result = await findUserResource(mockModel, 'resource-123', 'user-123');

      expect(mockModel.findOne).toHaveBeenCalledWith({
        where: { id: 'resource-123', userId: 'user-123' },
      });
      expect(result).toEqual(mockResource);
    });

    it('should return null when resource not found', async () => {
      const mockModel = createMockModel(null);

      const result = await findUserResource(mockModel, 'non-existent', 'user-123');

      expect(result).toBeNull();
    });
  });

  // =====================================
  // sendNotFound
  // =====================================
  describe('sendNotFound', () => {
    it('should send 404 response with correct format', () => {
      const res = createMockResponse();

      sendNotFound(res, 'Profile');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Profile not found',
      });
    });

    it('should use resource name in message', () => {
      const res = createMockResponse();

      sendNotFound(res, 'Project');

      expect(res.json).toHaveBeenCalledWith({
        error: 'Not Found',
        message: 'Project not found',
      });
    });
  });

  // =====================================
  // sendSuccess
  // =====================================
  describe('sendSuccess', () => {
    it('should send 200 response with data by default', () => {
      const res = createMockResponse();
      const data = { id: '123', name: 'Test' };

      sendSuccess(res, data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data });
    });

    it('should use custom status code when provided', () => {
      const res = createMockResponse();
      const data = { id: '123' };

      sendSuccess(res, data, 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data });
    });

    it('should handle array data', () => {
      const res = createMockResponse();
      const data = [{ id: '1' }, { id: '2' }];

      sendSuccess(res, data);

      expect(res.json).toHaveBeenCalledWith({ data });
    });

    it('should handle null data', () => {
      const res = createMockResponse();

      sendSuccess(res, null);

      expect(res.json).toHaveBeenCalledWith({ data: null });
    });
  });

  // =====================================
  // sendSuccessWithMessage
  // =====================================
  describe('sendSuccessWithMessage', () => {
    it('should send 200 response with message and data by default', () => {
      const res = createMockResponse();
      const data = { id: '123', name: 'Test' };

      sendSuccessWithMessage(res, 'Operation successful', data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Operation successful',
        data,
      });
    });

    it('should use custom status code when provided', () => {
      const res = createMockResponse();
      const data = { id: '123' };

      sendSuccessWithMessage(res, 'Created successfully', data, 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Created successfully',
        data,
      });
    });
  });

  // =====================================
  // sendList
  // =====================================
  describe('sendList', () => {
    it('should send response with count and data', () => {
      const res = createMockResponse();
      const items = [{ id: '1' }, { id: '2' }, { id: '3' }];

      sendList(res, items);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        count: 3,
        data: items,
      });
    });

    it('should handle empty array', () => {
      const res = createMockResponse();

      sendList(res, []);

      expect(res.json).toHaveBeenCalledWith({
        count: 0,
        data: [],
      });
    });

    it('should correctly count items', () => {
      const res = createMockResponse();
      const items = [1, 2, 3, 4, 5];

      sendList(res, items);

      expect(res.json).toHaveBeenCalledWith({
        count: 5,
        data: items,
      });
    });
  });

  // =====================================
  // buildUpdateObject
  // =====================================
  describe('buildUpdateObject', () => {
    it('should include only defined fields', () => {
      const fields = { name: 'New Name', bio: undefined };
      const current = { name: 'Old Name', bio: 'Old Bio' };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({ name: 'New Name', bio: 'Old Bio' });
    });

    it('should include null values (explicit null is not undefined)', () => {
      const fields: { name: string; bio: string | null } = { name: 'New Name', bio: null };
      const current: { name: string; bio: string | null } = { name: 'Old Name', bio: 'Old Bio' };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({ name: 'New Name', bio: null });
    });

    it('should handle all fields being defined', () => {
      const fields = { name: 'New Name', description: 'New Description' };
      const current = { name: 'Old Name', description: 'Old Description' };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({ name: 'New Name', description: 'New Description' });
    });

    it('should handle all fields being undefined', () => {
      const fields = { name: undefined, bio: undefined };
      const current = { name: 'Old Name', bio: 'Old Bio' };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({ name: 'Old Name', bio: 'Old Bio' });
    });

    it('should handle empty fields object', () => {
      const fields = {};
      const current = { name: 'Old Name' };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({});
    });

    it('should handle array values', () => {
      const fields = { tags: ['new', 'tags'], rules: undefined };
      const current = { tags: ['old'], rules: ['keep'] };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({ tags: ['new', 'tags'], rules: ['keep'] });
    });

    it('should handle numeric values', () => {
      const fields = { maxLength: 500, minLength: undefined };
      const current = { maxLength: 100, minLength: 10 };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({ maxLength: 500, minLength: 10 });
    });

    it('should handle falsy values correctly (0, empty string, false)', () => {
      const fields = { count: 0, enabled: false, name: '' };
      const current = { count: 10, enabled: true, name: 'Old' };

      const result = buildUpdateObject(fields, current);

      expect(result).toEqual({ count: 0, enabled: false, name: '' });
    });

    it('should not include fields that are not in current when undefined', () => {
      const fields = { newField: undefined };
      const current = { existingField: 'value' };

      const result = buildUpdateObject(fields, current as Record<string, unknown>);

      expect(result).not.toHaveProperty('newField');
    });
  });
});
