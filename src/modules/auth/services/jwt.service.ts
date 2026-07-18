import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../../../config';
import { TokenPayload } from '../types/auth.types';
import { TokenExpiredException, TokenInvalidException } from '../../../shared/types/error.types';

export class JwtService {
  /**
   * Generate access token (short-lived, 15 minutes)
   */
  generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
    return jwt.sign(
      { ...payload, type: 'access' },
      config.jwt.secret,
      { expiresIn: config.jwt.accessTokenExpiry }
    );
  }

  /**
   * Generate refresh token (default 7 days, or custom expiry e.g. 30d)
   */
  generateRefreshToken(
    payload: Omit<TokenPayload, 'type'>,
    expiresIn: SignOptions['expiresIn'] = config.jwt.refreshTokenExpiry as SignOptions['expiresIn']
  ): string {
    return jwt.sign(
      { ...payload, type: 'refresh' },
      config.jwt.secret,
      { expiresIn }
    );
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      if (decoded.type !== 'access') {
        throw new TokenInvalidException('Invalid token type');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredException('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new TokenInvalidException('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
      if (decoded.type !== 'refresh') {
        throw new TokenInvalidException('Invalid token type');
      }
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredException('Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new TokenInvalidException('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Hash a token for storage
   */
  hashToken(token: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get token expiry in seconds
   */
  getAccessTokenExpiry(): number {
    const expiry = config.jwt.accessTokenExpiry;
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 60 * 60 * 24;
      default: return 900;
    }
  }
}

export const jwtService = new JwtService();
export default jwtService;