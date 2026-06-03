import { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';

// ============================================================
// EXPRESS MOCK HELPERS
// ============================================================

export interface MockRequestOptions {
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  user?: any;
  requestId?: string;
  path?: string;
  method?: string;
  ip?: string;
}

export const createMockRequest = (options: MockRequestOptions = {}): Partial<Request> => {
  const req: Partial<Request> = {
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    user: options.user,
    requestId: options.requestId || 'test-request-id',
    path: options.path || '/test',
    method: options.method || 'GET',
    ip: options.ip || '127.0.0.1',
    get: vi.fn((header: string) => options.headers?.[header]),
  };
  return req;
};

export const createMockResponse = (): { res: Partial<Response>; jsonMock: any; statusMock: any } => {
  const jsonMock = vi.fn();
  const statusMock = vi.fn().mockReturnThis();
  const setHeaderMock = vi.fn().mockReturnThis();
  const endMock = vi.fn().mockReturnThis();

  const res: Partial<Response> = {
    json: jsonMock,
    status: statusMock,
    setHeader: setHeaderMock,
    end: endMock,
    statusCode: 200,
  };

  return { res, jsonMock, statusMock };
};

export const createMockNextFunction = (): NextFunction & { mockImplementation?: any } => {
  const next: any = vi.fn();
  return next;
};

// Mock error handler
export const createMockErrorHandler = () => {
  return (error: any, req: any, res: any, next: any) => {
    if (error) {
      if (!res.headersSent) {
        res.status(error.httpStatus || 500).json({
          success: false,
          error: {
            code: error.code || 'INTERNAL_ERROR',
            message: error.message,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
    next(error);
  };
};

export default {
  createMockRequest,
  createMockResponse,
  createMockNextFunction,
};