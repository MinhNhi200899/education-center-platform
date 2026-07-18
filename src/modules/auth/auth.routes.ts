import { Router } from 'express';
import { z } from 'zod';
import * as authController from './auth.controller';
import { authenticate } from './middleware/authenticate';
import { blockPublicRegisterInProduction } from './middleware/block-public-register';
import { validateRequest } from '../../shared/middleware/validate-request';

// Request body schemas (validateRequest parses req.body directly)
const loginBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerBodySchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    phone: z.string().regex(/^(0[0-9]{9,10})$/, 'Invalid Vietnamese phone number').optional(),
    centerId: z.string().uuid('Invalid center ID').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const forgotPasswordBodySchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordBodySchema = z
  .object({
    token: z.string().min(1, 'Token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.password, {
    message: 'New password must be different from current password',
    path: ['password'],
  });

const refreshTokenBodySchema = z.object({
  refreshToken: z.string().optional(),
});

// Router
const router = Router();

/**
 * @route POST /api/v1/auth/register
 * @description Register a new user
 * @access Public
 */
router.post(
  '/register',
  blockPublicRegisterInProduction,
  validateRequest({ body: registerBodySchema }),
  authController.register
);

/**
 * @route POST /api/v1/auth/login
 * @description Login user and return tokens
 * @access Public
 */
router.post(
  '/login',
  validateRequest({ body: loginBodySchema }),
  authController.login
);

/**
 * @route POST /api/v1/auth/logout
 * @description Logout user and invalidate refresh token
 * @access Authenticated
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route POST /api/v1/auth/refresh
 * @description Refresh access token
 * @access Public
 */
router.post(
  '/refresh',
  validateRequest({ body: refreshTokenBodySchema }),
  authController.refreshToken
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @description Request password reset email
 * @access Public
 */
router.post(
  '/forgot-password',
  validateRequest({ body: forgotPasswordBodySchema }),
  authController.forgotPassword
);

/**
 * @route POST /api/v1/auth/reset-password
 * @description Reset password with token
 * @access Public
 */
router.post(
  '/reset-password',
  validateRequest({ body: resetPasswordBodySchema }),
  authController.resetPassword
);

/**
 * @route GET /api/v1/auth/me
 * @description Get current authenticated user
 * @access Authenticated
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

/**
 * @route PUT /api/v1/auth/password
 * @description Change password for authenticated user
 * @access Authenticated
 */
router.put(
  '/password',
  authenticate,
  validateRequest({ body: changePasswordBodySchema }),
  authController.changePassword
);

export default router;