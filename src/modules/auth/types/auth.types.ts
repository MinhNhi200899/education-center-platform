import { UserStatus, User } from '@prisma/client';

// DTOs for Auth module
export interface RegisterDTO {
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
  centerId?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

export interface RefreshTokenDTO {
  refreshToken?: string;
}

// Response types
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  phone?: string;
  centerId: string | null;
  status: UserStatus;
  roles: string[];
  center?: CenterInfo | null;
  createdAt: Date;
}

export interface CenterInfo {
  id: string;
  name: string;
  code: string;
}

export interface LogoutResponse {
  message: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface MessageResponse {
  message: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  centerId: string | null;
  type?: 'access' | 'refresh';
}

// Session info for token generation
export interface SessionInfo {
  userId: string;
  email: string;
  centerId: string | null;
  roles: string[];
  ipAddress?: string;
  userAgent?: string;
}

// Prisma User include type (for authenticated user)
export interface UserWithRoles {
  id: string;
  email: string;
  phone: string | null;
  centerId: string | null;
  status: UserStatus;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;
  failedLoginCount: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  center: {
    id: string;
    name: string;
    code: string;
  } | null;
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      permissions: Array<{ name: string }>;
    };
    centerId: string | null;
  }>;
}

// Transform UserWithRoles to AuthenticatedUser
export interface AuthenticatedUser {
  id: string;
  email: string;
  phone: string | null;
  centerId: string | null;
  roles: Array<{
    id: string;
    name: string;
    centerId: string | null;
    permissions: string[];
  }>;
  center: {
    id: string;
    name: string;
    code: string;
  } | null;
}