import { Request, Response } from 'express';
import { authService } from './services/auth.service';
import { asyncHandler } from '../../shared/utils/async-handler';
import { AuthResponse, MessageResponse } from './types/auth.types';

/**
 * @route POST /api/v1/auth/register
 * @description Register a new user
 * @access Public
 */
export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result: AuthResponse = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * @route POST /api/v1/auth/login
 * @description Login user and return tokens
 * @access Public
 */
export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result: AuthResponse = await authService.login(req.body, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * @route POST /api/v1/auth/logout
 * @description Logout user and invalidate refresh token
 * @access Authenticated
 */
export const logout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const refreshToken = req.body?.refreshToken;

    await authService.logout(userId, refreshToken);

    const response: MessageResponse = { message: 'Logged out successfully' };

    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * @route POST /api/v1/auth/refresh
 * @description Refresh access token
 * @access Public (uses refresh token)
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.body?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const result: AuthResponse = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * @route POST /api/v1/auth/forgot-password
 * @description Request password reset email
 * @access Public
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ipAddress = req.ip || req.socket.remoteAddress;

    await authService.forgotPassword(req.body.email, ipAddress);

    // Always return success to prevent email enumeration
    const response: MessageResponse = {
      message: 'If the email exists, password reset instructions will be sent',
    };

    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * @route POST /api/v1/auth/reset-password
 * @description Reset password with token
 * @access Public
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const { token, password } = req.body;

    await authService.resetPassword(token, password, ipAddress);

    const response: MessageResponse = { message: 'Password reset successfully' };

    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * @route GET /api/v1/auth/me
 * @description Get current authenticated user
 * @access Authenticated
 */
export const getMe = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;

    const user = await authService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      data: user,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

/**
 * @route PUT /api/v1/auth/password
 * @description Change password for authenticated user
 * @access Authenticated
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { currentPassword, password } = req.body;

    await authService.changePassword(userId, currentPassword, password);

    const response: MessageResponse = { message: 'Password changed successfully' };

    res.status(200).json({
      success: true,
      data: response,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);