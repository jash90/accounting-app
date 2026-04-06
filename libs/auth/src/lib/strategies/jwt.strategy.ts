import { Injectable, OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
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

/**
 * Short-lived in-process cache for User lookups during JWT validation.
 * Prevents redundant DB queries when the same user makes multiple requests
 * in quick succession (e.g., SPA loading multiple resources).
 *
 * Cache entries are evicted after TTL or when tokenVersion mismatches.
 * Bounded to MAX_SIZE to prevent memory leaks.
 */
interface CachedUser {
  user: User;
  timestamp: number;
}

/** Cache TTL in milliseconds (60 seconds) */
const USER_CACHE_TTL = 60_000;
/** Maximum number of cached users */
const USER_CACHE_MAX_SIZE = 500;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) implements OnModuleDestroy {
  private readonly userCache = new Map<string, CachedUser>();
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

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

    // Periodic cleanup every 5 minutes to evict expired entries
    this.cleanupInterval = setInterval(() => this.evictExpiredEntries(), 5 * 60_000);
    if (this.cleanupInterval?.unref) {
      this.cleanupInterval.unref();
    }
  }

  async validate(payload: JwtPayload): Promise<User> {
    const now = Date.now();
    const cached = this.userCache.get(payload.sub);

    // Use cache if fresh AND tokenVersion matches (or is absent in payload)
    if (
      cached &&
      now - cached.timestamp < USER_CACHE_TTL &&
      (payload.tokenVersion === undefined || payload.tokenVersion === cached.user.tokenVersion)
    ) {
      // Still validate active status from cache
      if (!cached.user.isActive) {
        throw new UnauthorizedException(ErrorMessages.AUTH.ACCOUNT_INACTIVE);
      }
      return cached.user;
    }

    // Cache miss or expired — fetch from DB
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      // Remove stale cache entry if exists
      this.userCache.delete(payload.sub);
      throw new UnauthorizedException(ErrorMessages.AUTH.USER_NOT_FOUND);
    }

    if (!user.isActive) {
      this.userCache.delete(payload.sub);
      throw new UnauthorizedException(ErrorMessages.AUTH.ACCOUNT_INACTIVE);
    }

    // Verify tokenVersion — reject tokens issued before logout/password change.
    // Tokens without tokenVersion (pre-existing) are accepted for backward compatibility.
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      this.userCache.delete(payload.sub);
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    // Store in bounded cache
    this.setCacheEntry(payload.sub, { user, timestamp: now });

    return user;
  }

  private setCacheEntry(key: string, value: CachedUser): void {
    this.userCache.delete(key);
    while (this.userCache.size >= USER_CACHE_MAX_SIZE) {
      const oldestKey = this.userCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.userCache.delete(oldestKey);
      } else {
        break;
      }
    }
    this.userCache.set(key, value);
  }

  /**
   * Invalidate a specific user's cache entry.
   * Called when a user is deactivated or their tokens are invalidated.
   */
  invalidateUserCache(userId: string): void {
    this.userCache.delete(userId);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
    this.userCache.clear();
  }

  private evictExpiredEntries(): void {
    const now = Date.now();
    for (const [key, value] of this.userCache) {
      if (now - value.timestamp >= USER_CACHE_TTL) {
        this.userCache.delete(key);
      }
    }
  }
}
