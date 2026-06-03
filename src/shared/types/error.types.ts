import { ValidationError } from './api.types';

export class BaseException extends Error {
  constructor(
    public message: string,
    public code: string,
    public httpStatus: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class ValidationException extends BaseException {
  constructor(message: string, public details: ValidationError[] = []) {
    super(message, 'VALIDATION_ERROR', 400);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class NotFoundException extends BaseException {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictException extends BaseException {
  constructor(message: string, code: string = 'CONFLICT') {
    super(message, code, 409);
  }
}

export class UnauthorizedException extends BaseException {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenException extends BaseException {
  constructor(message: string = 'Access denied') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class BadRequestException extends BaseException {
  constructor(message: string, code: string = 'BAD_REQUEST') {
    super(message, code, 400);
  }
}

export class AccountLockedException extends BaseException {
  constructor(message: string = 'Account is locked') {
    super(message, 'ACCOUNT_LOCKED', 423);
  }
}

export class TokenExpiredException extends BaseException {
  constructor(message: string = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401);
  }
}

export class TokenInvalidException extends BaseException {
  constructor(message: string = 'Invalid token') {
    super(message, 'TOKEN_INVALID', 401);
  }
}

export class BusinessException extends BaseException {
  constructor(message: string, code: string) {
    super(message, code, 422);
  }
}

export class InternalException extends BaseException {
  constructor(message: string = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500);
  }
}