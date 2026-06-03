// ============================================================
// TEST SETUP AND TEARDOWN
// Vitest configuration and global test setup
// ============================================================

import { vi } from 'vitest';
import { mockPrismaClient, resetPrismaMocks } from './mocks/prisma.mock';

vi.mock('../src/config/database', () => ({
  prisma: mockPrismaClient,
  connectDatabase: vi.fn(),
  disconnectDatabase: vi.fn(),
  default: mockPrismaClient,
}));

// Environment setup
process.env.NODE_ENV = 'test';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    'postgresql://ecmp_user:ecmp_password@localhost:5432/ecmp_db';
}
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.REFRESH_TOKEN_SECRET = 'test-refresh-secret-key-for-testing-only';
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000';

// Global test timeout
const DEFAULT_TIMEOUT = 30000;

beforeAll(() => {
  // Setup code that runs once before all tests
  console.log('🧪 Test suite starting...');
});

afterAll(() => {
  // Cleanup code that runs once after all tests
  console.log('✅ Test suite completed');
});

// Reset prisma mocks before each test (avoid clearing module-level vi.fn return values)
beforeEach(() => {
  resetPrismaMocks();
});

vi.setConfig({ testTimeout: DEFAULT_TIMEOUT });

// ============================================================
// CUSTOM MATCHERS
// ============================================================

expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () => `expected ${received} ${pass ? 'not to be' : 'to be'} a valid UUID`,
    };
  },
  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        `expected ${received} ${pass ? 'not to be' : 'to be'} within range ${min}-${max}`,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Expect {
      toBeValidUUID(): any;
      toBeWithinRange(min: number, max: number): any;
    }
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate a unique test email
 */
export const generateTestEmail = (prefix = 'test'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@test.com`;
};

/**
 * Generate a unique test phone
 */
export const generateTestPhone = (): string => {
  return `0${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
};

/**
 * Wait for a specified amount of time
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry a function until it succeeds or timeout
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  options: { retries?: number; delay?: number } = {}
): Promise<T> => {
  const { retries = 3, delay = 1000 } = options;
  let lastError: Error;

  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries - 1) {
        await wait(delay);
      }
    }
  }

  throw lastError!;
};

/**
 * Create a mock date string for a given offset from today
 */
export const mockDateString = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
};

/**
 * Assert that a value is not null or undefined
 */
export const assertNotNull = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) {
    throw new Error('Expected value to not be null or undefined');
  }
  return value;
};

/**
 * Deep clone an object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Create a partial mock of an object
 */
export const partialMock = <T extends object>(overrides: Partial<T>): T => {
  return { ...overrides } as T;
};

// Export all helpers
export const helpers = {
  generateTestEmail,
  generateTestPhone,
  wait,
  retry,
  mockDateString,
  assertNotNull,
  deepClone,
  partialMock,
};

export default helpers;