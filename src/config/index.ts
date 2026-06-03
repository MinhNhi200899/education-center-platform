export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessTokenExpiry: '15m', // 15 minutes
    refreshTokenExpiry: '7d', // 7 days
    refreshTokenRotation: true, // Rotate tokens on each refresh
  },

  // bcrypt
  bcrypt: {
    saltRounds: 12,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    authMax: 5, // 5 attempts for auth endpoints
    authWindowMs: 15 * 60 * 1000, // 15 minutes
  },

  // Password Reset
  passwordReset: {
    expiryHours: 1, // 1 hour
    tokenLength: 32,
  },

  // Account Lockout
  accountLockout: {
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
  },

  // CORS (ALLOWED_ORIGINS or CORS_ORIGINS — Vercel URL comma-separated)
  cors: {
    allowedOrigins: (
      process.env.ALLOWED_ORIGINS ||
      process.env.CORS_ORIGINS ||
      'http://localhost:3000'
    )
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    credentials: true,
  },

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
  },
} as const;

export type Config = typeof config;
export default config;