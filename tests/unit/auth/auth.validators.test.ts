import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../../../src/modules/auth/validators/auth.validators';
import { generateId } from '../../factories/data.factory';

// ============================================================
// UNIT TESTS - AUTH VALIDATORS
// ============================================================

describe('Auth Validators', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const invalidData = {
        body: {
          password: 'Password123!',
        },
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        body: {
          email: 'not-an-email',
          password: 'Password123!',
        },
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
        },
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'short',
        },
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          phone: '0123456789',
        },
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject passwords that do not match', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'password123!',
          confirmPassword: 'password123!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'PASSWORD123!',
          confirmPassword: 'PASSWORD123!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'PasswordABC!',
          confirmPassword: 'PasswordABC!',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid Vietnamese phone', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          phone: '0123456789',
        },
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid phone format', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          phone: '12345', // Too short
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept valid centerId', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          centerId: generateId(),
        },
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid centerId format', () => {
      const invalidData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          centerId: 'not-a-uuid',
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept empty phone (optional)', () => {
      const validData = {
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        },
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate correct email', () => {
      const validData = {
        body: {
          email: 'test@example.com',
        },
      };

      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        body: {
          email: 'not-an-email',
        },
      };

      const result = forgotPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const invalidData = {
        body: {},
      };

      const result = forgotPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate correct reset data', () => {
      const validData = {
        body: {
          token: 'some-reset-token',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        },
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing token', () => {
      const invalidData = {
        body: {
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        },
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject password mismatch', () => {
      const invalidData = {
        body: {
          token: 'some-token',
          password: 'NewPassword123!',
          confirmPassword: 'DifferentPassword!',
        },
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordSchema', () => {
    it('should validate correct change password data', () => {
      const validData = {
        body: {
          currentPassword: 'OldPassword123!',
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        },
      };

      const result = changePasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing current password', () => {
      const invalidData = {
        body: {
          password: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        },
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject new password same as current', () => {
      const invalidData = {
        body: {
          currentPassword: 'SamePassword123!',
          password: 'SamePassword123!',
          confirmPassword: 'SamePassword123!',
        },
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak new password', () => {
      const invalidData = {
        body: {
          currentPassword: 'OldPassword123!',
          password: 'weak',
          confirmPassword: 'weak',
        },
      };

      const result = changePasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate correct refresh token data', () => {
      const validData = {
        body: {
          refreshToken: 'some-refresh-token',
        },
      };

      const result = refreshTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should allow empty body (optional refresh token)', () => {
      const validData = {
        body: {},
      };

      const result = refreshTokenSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});