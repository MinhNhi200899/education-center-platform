import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcrypt';
import { AuthService } from '../../../src/modules/auth/services/auth.service';
import { mockPrismaClient, resetPrismaMocks } from '../../mocks/prisma.mock';
import { mockLogger, resetLoggerMocks } from '../../mocks/logger.mock';
import {
  createMockUser,
  createMockCenter,
  generateId,
} from '../../factories/data.factory';
import { UserStatus } from '@prisma/client';
import {
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  AccountLockedException,
  TokenInvalidException,
} from '../../../src/shared/types/error.types';

// Mock jwt service
vi.mock('../../../src/modules/auth/services/jwt.service', () => ({
  jwtService: {
    generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
    generateRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    hashToken: vi.fn().mockReturnValue('hashed-token'),
    getAccessTokenExpiry: vi.fn().mockReturnValue(900),
  },
}));

// Mock config
vi.mock('../../../src/config', () => ({
  config: {
    bcrypt: { saltRounds: 12 },
    accountLockout: {
      maxFailedAttempts: 5,
      lockoutDurationMinutes: 30,
    },
    passwordReset: {
      expiryHours: 1,
    },
  },
}));

// ============================================================
// UNIT TESTS - AUTH SERVICE
// ============================================================

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    resetPrismaMocks();
    resetLoggerMocks();
    service = new AuthService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // register Tests
  // ============================================================

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        phone: '0123456789',
      };

      const createdUser = createMockUser({
        email: userData.email,
        phone: userData.phone,
      });

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        ...createdUser,
        center: null,
        userRoles: [],
      });
      mockPrismaClient.refreshToken.create.mockResolvedValue({ id: generateId() });

      const result = await service.register(userData);

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(userData.email);
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = createMockUser({ email: 'existing@test.com' });

      mockPrismaClient.user.findUnique.mockResolvedValue(existingUser);

      await expect(
        service.register({
          email: 'existing@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should validate center exists when provided', async () => {
      const centerId = generateId();

      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.center.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          centerId,
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // login Tests
  // ============================================================

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const password = 'Password123!';
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = createMockUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        status: UserStatus.active,
        failedLoginCount: 0,
      });

      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...user,
        center: null,
        userRoles: [
          {
            role: {
              id: generateId(),
              name: 'user',
              permissions: [],
            },
            centerId: null,
          },
        ],
      });
      mockPrismaClient.user.update.mockResolvedValue(user);
      mockPrismaClient.refreshToken.create.mockResolvedValue({ id: generateId() });
      mockPrismaClient.refreshToken.findFirst.mockResolvedValue(null);

      const result = await service.login({ email: user.email, password });

      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(user.email);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@test.com', password: 'Password123!' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw AccountLockedException when account is locked', async () => {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now
      const user = createMockUser({
        email: 'test@example.com',
        lockedUntil,
      });

      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...user,
        center: null,
        userRoles: [],
      });

      await expect(
        service.login({ email: user.email, password: 'Password123!' })
      ).rejects.toThrow(AccountLockedException);
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 12);
      const user = createMockUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        failedLoginCount: 0,
      });

      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...user,
        center: null,
        userRoles: [
          {
            role: { id: generateId(), name: 'user', permissions: [] },
            centerId: null,
          },
        ],
      });
      mockPrismaClient.user.update.mockResolvedValue({
        ...user,
        failedLoginCount: user.failedLoginCount + 1,
      });

      await expect(
        service.login({ email: user.email, password: 'WrongPassword!' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should lock account after max failed attempts', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 12);
      const user = createMockUser({
        email: 'test@example.com',
        passwordHash: hashedPassword,
        failedLoginCount: 4, // One more will lock
      });

      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...user,
        center: null,
        userRoles: [
          {
            role: { id: generateId(), name: 'user', permissions: [] },
            centerId: null,
          },
        ],
      });
      mockPrismaClient.user.update.mockResolvedValue({
        ...user,
        failedLoginCount: 5,
        lockedUntil: expect.any(Date),
      });

      await expect(
        service.login({ email: user.email, password: 'WrongPassword!' })
      ).rejects.toThrow(AccountLockedException);
    });

    it('should throw UnauthorizedException when account is not active', async () => {
      const user = createMockUser({
        email: 'test@example.com',
        status: UserStatus.inactive,
      });

      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...user,
        center: null,
        userRoles: [
          {
            role: { id: generateId(), name: 'user', permissions: [] },
            centerId: null,
          },
        ],
      });

      await expect(
        service.login({ email: user.email, password: 'Password123!' })
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================
  // logout Tests
  // ============================================================

  describe('logout', () => {
    it('should logout user and invalidate refresh token', async () => {
      const userId = generateId();
      const refreshToken = 'some-refresh-token';

      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(userId, refreshToken);

      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            tokenHash: 'hashed-token',
            isRevoked: false,
          }),
          data: { isRevoked: true },
        })
      );
    });

    it('should invalidate all refresh tokens when no token provided', async () => {
      const userId = generateId();

      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 5 });

      await service.logout(userId);

      expect(mockPrismaClient.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, isRevoked: false },
          data: { isRevoked: true },
        })
      );
    });
  });

  // ============================================================
  // changePassword Tests
  // ============================================================

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = generateId();
      const currentPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';
      const hashedPassword = await bcrypt.hash(currentPassword, 12);

      const user = createMockUser({
        id: userId,
        passwordHash: hashedPassword,
      });

      mockPrismaClient.user.findUnique.mockResolvedValue(user);
      mockPrismaClient.user.update.mockResolvedValue(user);
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await service.changePassword(userId, currentPassword, newPassword);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      });
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      const userId = generateId();
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 12);

      const user = createMockUser({
        id: userId,
        passwordHash: hashedPassword,
      });

      mockPrismaClient.user.findUnique.mockResolvedValue(user);

      await expect(
        service.changePassword(userId, 'WrongPassword!', 'NewPassword123!')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword(generateId(), 'OldPassword!', 'NewPassword!')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // getCurrentUser Tests
  // ============================================================

  describe('getCurrentUser', () => {
    it('should return current user info', async () => {
      const userId = generateId();
      const user = createMockUser({ id: userId });

      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...user,
        center: null,
        userRoles: [
          {
            role: { id: generateId(), name: 'user', permissions: [] },
            centerId: null,
          },
        ],
      });

      const result = await service.getCurrentUser(userId);

      expect(result.id).toBe(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser(generateId())).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================
  // forgotPassword Tests
  // ============================================================

  describe('forgotPassword', () => {
    it('should not throw when email does not exist (security)', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      // Should not throw - security best practice
      await expect(
        service.forgotPassword('nonexistent@test.com')
      ).resolves.toBeUndefined();
    });

    it('should create reset token for existing user', async () => {
      const user = createMockUser({ email: 'test@example.com' });

      mockPrismaClient.user.findUnique.mockResolvedValue(user);
      mockPrismaClient.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaClient.passwordReset.create.mockResolvedValue({
        id: generateId(),
        userId: user.id,
        tokenHash: 'hashed-token',
        expiresAt: new Date(),
        usedAt: null,
        ipAddress: null,
        createdAt: new Date(),
      });

      await service.forgotPassword(user.email);

      expect(mockPrismaClient.passwordReset.create).toHaveBeenCalled();
    });
  });

  // ============================================================
  // resetPassword Tests
  // ============================================================

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const userId = generateId();
      const user = createMockUser({ id: userId });

      const resetRecord = {
        id: generateId(),
        userId,
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        usedAt: null,
        ipAddress: null,
        createdAt: new Date(),
        user,
      };

      mockPrismaClient.passwordReset.findFirst.mockResolvedValue(resetRecord);
      mockPrismaClient.user.update.mockResolvedValue(user);
      mockPrismaClient.passwordReset.update.mockResolvedValue({
        ...resetRecord,
        usedAt: new Date(),
      });
      mockPrismaClient.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await service.resetPassword('valid-token', 'NewPassword123!');

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      });
    });

    it('should throw TokenInvalidException when token is invalid or expired', async () => {
      mockPrismaClient.passwordReset.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'NewPassword123!')
      ).rejects.toThrow(TokenInvalidException);
    });
  });
});