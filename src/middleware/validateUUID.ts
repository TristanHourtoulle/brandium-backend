import { Request, Response, NextFunction } from 'express';
import { param, validationResult } from 'express-validator';

/**
 * UUID validation regex pattern (v4)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate UUID parameter format
 * Can be used as a standalone middleware
 * @param paramName - Name of the parameter to validate (default: 'id')
 */
export function validateUUID(paramName: string = 'id') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const value = req.params[paramName];

    if (!value || !UUID_REGEX.test(value)) {
      res.status(400).json({
        error: 'Validation Error',
        details: [
          {
            type: 'field',
            msg: `Invalid ${paramName} format`,
            path: paramName,
            location: 'params',
            value,
          },
        ],
      });
      return;
    }

    next();
  };
}

/**
 * Express-validator based UUID validation
 * Use with other validators in a chain
 * @param paramName - Name of the parameter to validate
 * @param resourceName - Name of the resource for error message
 */
export function uuidParamValidator(paramName: string, resourceName: string) {
  return param(paramName)
    .isUUID()
    .withMessage(`Invalid ${resourceName} ID`);
}

/**
 * Validate multiple UUID parameters
 * @param params - Array of parameter names to validate
 */
export function validateMultipleUUIDs(params: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const errors: Array<{
      type: string;
      msg: string;
      path: string;
      location: string;
      value: string;
    }> = [];

    for (const paramName of params) {
      const value = req.params[paramName];
      if (value && !UUID_REGEX.test(value)) {
        errors.push({
          type: 'field',
          msg: `Invalid ${paramName} format`,
          path: paramName,
          location: 'params',
          value,
        });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation Error',
        details: errors,
      });
      return;
    }

    next();
  };
}

export default validateUUID;
