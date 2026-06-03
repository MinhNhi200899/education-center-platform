import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../services/logger.service';
import {
  BaseException,
  ValidationException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  AccountLockedException,
  TokenExpiredException,
  TokenInvalidException,
  InternalException,
} from '../types/error.types';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId || 'unknown';

  // Log error
  if (error instanceof BaseException) {
    logger.warn(`Client error: ${error.message}`, {
      code: error.code,
      path: req.path,
      method: req.method,
      requestId,
    });
  } else {
    logger.error('Unhandled error', {
      message: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method,
      requestId,
    });
  }

  // Handle known exceptions
  if (error instanceof ValidationException) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error instanceof NotFoundException) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error instanceof ConflictException) {
    res.status(409).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error instanceof UnauthorizedException) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error instanceof ForbiddenException) {
    res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error instanceof AccountLockedException) {
    res.status(423).json({
      success: false,
      error: {
        code: 'ACCOUNT_LOCKED',
        message: error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error instanceof TokenExpiredException) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error instanceof TokenInvalidException) {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: error.message,
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  // Handle Zod validation errors
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
        path: req.path,
      },
    });
    return;
  }

  // Handle Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as { code: string };

    if (prismaError.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Record not found',
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_INVALID',
        message: 'Invalid or malformed token',
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Token has expired',
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
    return;
  }

  // Default error
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : error.message;

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message,
      timestamp: new Date().toISOString(),
      path: req.path,
    },
  });
};

export default errorHandler;