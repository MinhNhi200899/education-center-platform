import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodObject } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

const WRAPPER_KEYS = ['body', 'query', 'params'] as const;
type WrapperKey = (typeof WRAPPER_KEYS)[number];

/**
 * Schemas in this codebase are often defined as:
 *   z.object({ body: z.object({ ... }) })
 * but validateRequest must parse req.body / req.query / req.params directly.
 */
function unwrapPartSchema(schema: ZodSchema, part: WrapperKey): ZodSchema {
  if (!(schema instanceof ZodObject)) {
    return schema;
  }

  const shape = schema.shape as Partial<Record<WrapperKey, ZodSchema>>;
  const nested = shape[part];

  if (nested) {
    const hasOnlyWrapperKeys = Object.keys(shape).every((key) =>
      WRAPPER_KEYS.includes(key as WrapperKey)
    );
    if (hasOnlyWrapperKeys) {
      return nested;
    }
  }

  return schema;
}

export const validateRequest = (options: ValidateOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (options.body) {
        req.body = await unwrapPartSchema(options.body, 'body').parseAsync(req.body);
      }
      if (options.query) {
        req.query = (await unwrapPartSchema(options.query, 'query').parseAsync(req.query)) as Request['query'];
      }
      if (options.params) {
        req.params = (await unwrapPartSchema(options.params, 'params').parseAsync(req.params)) as Request['params'];
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: error.errors.map((err) => ({
              field: err.path.join('.'),
              message: err.message,
            })),
            timestamp: new Date().toISOString(),
          },
        });
        return;
      }
      next(error);
    }
  };
};

export default validateRequest;
