import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';

import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';

import { ErrorMessages, User } from '@accounting/common';

import { COOKIE_NAMES } from '../utils/cookie-options';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string | null;
  /** Token version for revocation. Optional for backward compatibility with pre-existing tokens. */
  tokenVersion?: number;
}

/**
 * Extracts JWT from httpOnly cookie OR Authorization header (dual-mode).
 * Priority: Authorization header > Cookie (to support both during migration).
 */
function extractJwtDualMode(req: Request): string | null {
  // 1. Try Authorization header first (existing clients)
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;

  // 2. Fall back to httpOnly cookie
  if (req.cookies?.[COOKIE_NAMES.ACCESS_TOKEN]) {
    return req.cookies[COOKIE_NAMES.ACCESS_TOKEN];
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {
    const jwtSecret = configService.getOrThrow<string>('JWT_SECRET');

    super({
      jwtFromRequest: extractJwtDualMode,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ErrorMessages.AUTH.ACCOUNT_INACTIVE);
    }

    // Verify tokenVersion — reject tokens issued before logout/password change.
    // Tokens without tokenVersion (pre-existing) are accepted for backward compatibility.
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    return user;
  }
}
