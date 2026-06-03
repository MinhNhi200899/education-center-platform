import bcrypt from 'bcrypt';
import { PrismaClient, User, UserStatus } from '@prisma/client';
import { config } from '../../../config';
import { logger } from '../../../shared/services/logger.service';
import { jwtService } from './jwt.service';
import { prisma } from '../../../config/database';
import {
  AuthResponse,
  UserResponse,
  RegisterDTO,
  LoginDTO,
  SessionInfo,
  AuthenticatedUser,
} from '../types/auth.types';
import {
  UnauthorizedException,
  ValidationException,
  ConflictException,
  NotFoundException,
  AccountLockedException,
  TokenExpiredException,
  TokenInvalidException,
} from '../../../shared/types/error.types';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterDTO): Promise<AuthResponse> {
    const { email, password, phone, centerId } = data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered', 'EMAIL_EXISTS');
    }

    // Validate center exists if provided
    if (centerId) {
      const center = await prisma.center.findUnique({
        where: { id: centerId },
      });
      if (!center) {
        throw new NotFoundException('Center');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        phone: phone || null,
        centerId: centerId || null,
        status: UserStatus.active,
      },
      include: {
        center: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    logger.info('User registered', { userId: user.id, email: user.email });

    // Generate tokens
    const sessionInfo = this.buildSessionInfo(user);
    return this.generateAuthResponse(user, sessionInfo);
  }

  /**
   * Login user
   */
  async login(data: LoginDTO, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user with roles
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        center: true,
        userRoles: {
          include: {
            role: {
              include: { permissions: true },
            },
          },
        },
      },
    });

    if (!user) {
      logger.warn('Login failed - user not found', { email });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      logger.warn('Login failed - account locked', { userId: user.id, email });
      throw new AccountLockedException(
        `Account is locked until ${user.lockedUntil.toISOString()}`
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed login count
      await this.handleFailedLogin(user);

      // Check if account should be locked
      if (user.failedLoginCount + 1 >= config.accountLockout.maxFailedAttempts) {
        await this.lockAccount(user.id);
        throw new AccountLockedException(
          `Account locked due to ${config.accountLockout.maxFailedAttempts} failed attempts`
        );
      }

      logger.warn('Login failed - invalid password', { userId: user.id, email });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is active
    if (user.status !== UserStatus.active) {
      logger.warn('Login failed - account not active', { userId: user.id, status: user.status });
      throw new UnauthorizedException('Account is not active');
    }

    // Reset failed login count on successful login
    await this.handleSuccessfulLogin(user.id, ipAddress, userAgent);

    // Get fresh user data with roles
    const freshUser = await this.getUserWithRoles(user.id);

    logger.info('User logged in', { userId: user.id, email });

    const sessionInfo = this.buildSessionInfo(freshUser);
    return this.generateAuthResponse(freshUser, sessionInfo);
  }

  /**
   * Logout user - invalidate refresh token
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Invalidate specific refresh token
      const tokenHash = jwtService.hashToken(refreshToken);
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
        },
      });
    } else {
      // Invalidate all refresh tokens for user
      await prisma.refreshToken.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
    }

    logger.info('User logged out', { userId });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // Verify refresh token
    const payload = jwtService.verifyRefreshToken(refreshToken);

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        center: true,
        userRoles: {
          include: {
            role: {
              include: { permissions: true },
            },
          },
        },
      },
    });

    if (!user) {
      throw new TokenInvalidException('User not found');
    }

    // Check if account is active
    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('Account is not active');
    }

    // Verify refresh token exists and is not revoked
    const tokenHash = jwtService.hashToken(refreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: user.id,
        tokenHash,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedToken) {
      throw new TokenInvalidException('Refresh token not found or revoked');
    }

    // Rotate token: revoke old and create new
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // Generate new tokens
    const sessionInfo = this.buildSessionInfo(user);

    // Create new refresh token
    const newRefreshToken = jwtService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      centerId: user.centerId,
    });

    // Store new refresh token
    await this.storeRefreshToken(
      user.id,
      newRefreshToken,
      storedToken.ipAddress ?? undefined,
      storedToken.userAgent ?? undefined
    );

    // Generate access token
    const newAccessToken = jwtService.generateAccessToken({
      userId: user.id,
      email: user.email,
      centerId: user.centerId,
    });

    logger.info('Token refreshed', { userId: user.id });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: jwtService.getAccessTokenExpiry(),
      tokenType: 'Bearer',
      user: this.buildUserResponse(user),
    };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string, ipAddress?: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      logger.info('Password reset requested', { email: 'not found' });
      return;
    }

    // Generate reset token
    const resetToken = jwtService.generateRefreshToken({
      userId: user.id,
      email: user.email,
      centerId: user.centerId,
    });

    // Store reset token (use same model as password reset)
    const tokenHash = jwtService.hashToken(resetToken);

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + config.passwordReset.expiryHours);

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress || null,
      },
    });

    logger.info('Password reset token created', { userId: user.id });

    // In production, send email with reset token
    // await emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    // Find valid reset token
    const tokenHash = jwtService.hashToken(token);

    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    if (!resetRecord) {
      throw new TokenInvalidException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    // Mark reset token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: {
        usedAt: new Date(),
        ipAddress: ipAddress || null,
      },
    });

    // Invalidate all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { isRevoked: true },
    });

    logger.info('Password reset successfully', { userId: resetRecord.userId });
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User');
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens (force re-login)
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });

    logger.info('Password changed', { userId });
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    const user = await this.getUserWithRoles(userId);

    if (!user) {
      throw new NotFoundException('User');
    }

    return this.buildUserResponse(user);
  }

  /**
   * Verify access token and return user
   */
  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    const payload = jwtService.verifyAccessToken(token);

    const user = await this.getUserWithRoles(payload.userId);

    if (!user) {
      throw new TokenInvalidException('User not found');
    }

    if (user.status !== UserStatus.active) {
      throw new UnauthorizedException('Account is not active');
    }

    return this.buildAuthenticatedUser(user);
  }

  // Private helper methods

  private async getUserWithRoles(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        center: true,
        userRoles: {
          include: {
            role: {
              include: { permissions: true },
            },
          },
        },
      },
    });
  }

  private buildSessionInfo(user: any): SessionInfo {
    return {
      userId: user.id,
      email: user.email,
      centerId: user.centerId,
      roles: user.userRoles.map((ur: any) => ur.role.name),
    };
  }

  private async generateAuthResponse(
    user: any,
    sessionInfo: SessionInfo
  ): Promise<AuthResponse> {
    const accessToken = jwtService.generateAccessToken(sessionInfo);
    const refreshToken = jwtService.generateRefreshToken(sessionInfo);

    // Store refresh token
    await this.storeRefreshToken(
      user.id,
      refreshToken,
      sessionInfo.ipAddress,
      sessionInfo.userAgent
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: jwtService.getAccessTokenExpiry(),
      tokenType: 'Bearer',
      user: this.buildUserResponse(user),
    };
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const tokenHash = jwtService.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
      },
    });
  }

  private async handleFailedLogin(user: User): Promise<void> {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: { increment: 1 },
      },
    });
  }

  private async handleSuccessfulLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress || null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
  }

  private async lockAccount(userId: string): Promise<void> {
    const lockedUntil = new Date();
    lockedUntil.setMinutes(
      lockedUntil.getMinutes() + config.accountLockout.lockoutDurationMinutes
    );

    await prisma.user.update({
      where: { id: userId },
      data: { lockedUntil },
    });

    logger.warn('Account locked due to failed login attempts', { userId });
  }

  private buildUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      centerId: user.centerId,
      status: user.status,
      roles: user.userRoles.map((ur: any) => ur.role.name),
      center: user.center
        ? {
            id: user.center.id,
            name: user.center.name,
            code: user.center.code,
          }
        : null,
      createdAt: user.createdAt,
    };
  }

  private buildAuthenticatedUser(user: any): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      centerId: user.centerId,
      roles: user.userRoles.map((ur: any) => ({
        id: ur.role.id,
        name: ur.role.name,
        centerId: ur.centerId,
        permissions: ur.role.permissions.map((p: any) => p.name),
      })),
      center: user.center
        ? {
            id: user.center.id,
            name: user.center.name,
            code: user.center.code,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
export default authService;