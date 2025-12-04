import { Response } from 'express';
import { Model, ModelStatic, WhereOptions } from 'sequelize';

/**
 * Find a resource owned by a specific user
 * @param model - Sequelize model class
 * @param id - Resource ID (can be undefined, returns null if so)
 * @param userId - User ID (owner)
 * @returns The found resource or null
 */
export async function findUserResource<T extends Model>(
  model: ModelStatic<T>,
  id: string | undefined,
  userId: string,
): Promise<T | null> {
  if (!id) {
    return null;
  }
  return model.findOne({
    where: { id, userId } as WhereOptions,
  });
}

/**
 * Send a standardized 404 Not Found response
 * @param res - Express response object
 * @param resourceName - Name of the resource (e.g., 'Profile', 'Project')
 */
export function sendNotFound(res: Response, resourceName: string): void {
  res.status(404).json({
    error: 'Not Found',
    message: `${resourceName} not found`,
  });
}

/**
 * Send a standardized success response with data
 * @param res - Express response object
 * @param data - Data to include in response
 * @param status - HTTP status code (default: 200)
 */
export function sendSuccess<T>(res: Response, data: T, status: number = 200): void {
  res.status(status).json({ data });
}

/**
 * Send a standardized success response with message and data
 * @param res - Express response object
 * @param message - Success message
 * @param data - Data to include in response
 * @param status - HTTP status code (default: 200)
 */
export function sendSuccessWithMessage<T>(
  res: Response,
  message: string,
  data: T,
  status: number = 200,
): void {
  res.status(status).json({ message, data });
}

/**
 * Send a standardized list response with count
 * @param res - Express response object
 * @param items - Array of items
 */
export function sendList<T>(res: Response, items: T[]): void {
  res.status(200).json({
    count: items.length,
    data: items,
  });
}

/**
 * Build an update object from provided fields, excluding undefined values
 * Only includes fields that are explicitly provided (not undefined)
 * @param fields - Object with field names and their new values
 * @param current - Current model instance to use as fallback for nullable fields
 * @returns Object with only defined fields
 */
export function buildUpdateObject<T extends Record<string, unknown>>(
  fields: Partial<T>,
  current: T,
): Partial<T> {
  const updates: Partial<T> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates[key as keyof T] = value as T[keyof T];
    } else if (key in current) {
      // Keep current value if new value is undefined
      updates[key as keyof T] = current[key as keyof T];
    }
  }

  return updates;
}
