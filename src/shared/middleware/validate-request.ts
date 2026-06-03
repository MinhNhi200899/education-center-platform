import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

interface ValidateOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export const validateRequest = (options: ValidateOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (options.body) {
        req.body = await options.body.parseAsync(req.body);
      }
      if (options.query) {
        req.query = await options.query.parseAsync(req.query);
      }
      if (options.params) {
        req.params = await options.params.parseAsync(req.params);
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
