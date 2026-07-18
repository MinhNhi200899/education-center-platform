import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedUser } from '../../../shared/types/api.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function extractAccessToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }

  // EventSource cannot set Authorization headers — allow query token for SSE.
  const queryToken = req.query.access_token;
  if (typeof queryToken === 'string' && queryToken.trim()) {
    return queryToken.trim();
  }

  return null;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    const user = await authService.verifyAccessToken(token);
    req.user = user;
    next();
  } catch (error: any) {
    if (error.code === 'TOKEN_EXPIRED') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (error.code === 'TOKEN_INVALID') {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_INVALID',
          message: 'Invalid token',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next(error);
  }
};

export default authenticate;
