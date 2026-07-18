import { Request, Response, NextFunction } from 'express';

/**
 * Disable public self-registration in production (invite-only).
 * Set ALLOW_PUBLIC_REGISTER=true to override.
 */
export function blockPublicRegisterInProduction(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_PUBLIC_REGISTER !== 'true'
  ) {
    res.status(403).json({
      success: false,
      error: {
        code: 'REGISTRATION_DISABLED',
        message: 'Public registration is disabled. Contact an administrator.',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  next();
}
