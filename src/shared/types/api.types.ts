export interface ValidationError {
  field: string;
  message: string;
}

export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    timestamp: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ValidationError[];
    timestamp: string;
    path?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ErrorResponse;

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface AuthenticatedUser {
  id: string;
  email: string;
  centerId: string | null;
  roles: UserRole[];
  center: Center | null;
}

export interface UserRole {
  id: string;
  name: string;
  centerId: string | null;
  permissions: string[];
}

export interface Center {
  id: string;
  name: string;
  code: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  centerId: string | null;
  type: 'access' | 'refresh';
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: {
    id: string;
    email: string;
    centerId: string | null;
    roles: string[];
  };
}

// Request with user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId?: string;
    }
  }
}

export {};