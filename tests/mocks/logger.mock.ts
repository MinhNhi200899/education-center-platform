import { vi } from 'vitest';

// ============================================================
// LOGGER MOCK
// ============================================================

export const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
};

export const logger = mockLogger;

export const resetLoggerMocks = () => {
  mockLogger.info.mockReset();
  mockLogger.error.mockReset();
  mockLogger.warn.mockReset();
  mockLogger.debug.mockReset();
  mockLogger.log.mockReset();
};

export default mockLogger;