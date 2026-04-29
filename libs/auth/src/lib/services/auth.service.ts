import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import { compare, hash } from 'bcryptjs';
import { DataSource, IsNull, Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';

import { Company, ErrorMessages, RefreshToken, User, UserRole } from '@accounting/common';

import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from '../constants/jwt.constants';
import { AuthResponseDto, UserDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

/**
 * Refresh-token JWT payload — extends the standard claims with the rotation
 * fields persisted in `refresh_tokens`.
 */
interface RefreshJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  tokenVersion?: number;
  /** Per-token id; matches `RefreshToken.jti`. Absent on pre-rotation tokens. */
  jti?: string;
  /** Login-session group; matches `RefreshToken.family`. */
  family?: string;
}

/**
 * Parses a duration string like '7d', '15m', '900' (seconds) and returns ms.
 *
 * Mirrors the subset of formats `JwtService.sign(..., { expiresIn })` accepts
 * so we can compute `expiresAt` for the persisted refresh row.
 */
function durationToMs(input: string): number {
  // Pure number → seconds (jsonwebtoken convention)
  if (/^\d+$/.test(input)) {
    return Number(input) * 1000;
  }
  const match = /^(\d+)\s*(ms|s|m|h|d|w|y)$/.exec(input);
  if (!match) {
    throw new Error(`Cannot parse duration "${input}"`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
    y: 31_557_600_000,
  };
  return value * multipliers[unit];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @Inject(ACCESS_JWT_SERVICE)
    private readonly accessJwtService: JwtService,
    @Inject(REFRESH_JWT_SERVICE)
    private readonly refreshJwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // FIX-03: Self-registration always creates COMPANY_OWNER.
    // EMPLOYEE accounts are created by company owners via CompanyService.
    // ADMIN accounts are created by system administrators via AdminService.

    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: registerDto.email })
      .getOne();

    if (existingUser) {
      throw new ConflictException(ErrorMessages.AUTH.EMAIL_EXISTS);
    }

    const hashedPassword = await hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: UserRole.COMPANY_OWNER,
      companyId: null,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    return this.generateTokens(savedUser);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(ErrorMessages.AUTH.ACCOUNT_INACTIVE);
    }

    return this.generateTokens(user);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    // Constant-time: always perform bcrypt comparison to prevent timing attacks
    // Uses dummy hash when user doesn't exist to maintain consistent response time
    const hashToCompare = user?.password || '$2b$10$dummyhashtopreventtimingattacks';
    const isPasswordValid = await compare(password, hashToCompare);

    if (!user || !isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Refresh the access + refresh token pair with rotation and reuse detection.
   *
   * Flow:
   *   1. Verify the JWT signature + expiry.
   *   2. Reject if `tokenVersion` doesn't match (covers password change / forced logout).
   *   3. Look up the persisted `refresh_tokens` row by `jti`.
   *      - Pre-rotation tokens (no `jti`) are accepted ONCE for backward compatibility.
   *   4. If the row was already used → REUSE DETECTED. Invalidate the entire
   *      `family` and bump `tokenVersion` to kill in-flight access tokens.
   *   5. Otherwise mark the row used, then issue a new pair in the same family.
   *
   * Steps 4 and 5 run inside a DB transaction so a partial failure cannot
   * leave the row half-rotated.
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    let payload: RefreshJwtPayload;
    try {
      payload = this.refreshJwtService.verify<RefreshJwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    // Backward compatibility: tokens issued before this rotation feature
    // shipped have no `jti`. Accept them once, but immediately replace with
    // a properly tracked token (and a fresh family).
    if (!payload.jti || !payload.family) {
      this.logger.log(
        `Accepting legacy refresh token (no jti) for user ${user.id} — will rotate to tracked token`
      );
      return this.generateTokens(user);
    }

    const tokenRow = await this.refreshTokenRepository.findOne({
      where: { jti: payload.jti },
    });

    if (!tokenRow) {
      // JWT signature checked out, but we have no record of issuing this jti.
      // Either the row was deleted (logout) or the token is forged. Reject.
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    if (tokenRow.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    if (tokenRow.usedAt !== null) {
      // REUSE DETECTED — the legitimate user already rotated past this token.
      // Treat this as theft: kill the whole family + bump tokenVersion so any
      // in-flight access tokens for this user become invalid immediately.
      this.logger.warn(
        `Refresh-token reuse detected for user ${user.id}, family=${tokenRow.family}, jti=${tokenRow.jti}. Revoking family.`
      );
      await this.dataSource.transaction(async (mgr) => {
        await mgr.update(
          RefreshToken,
          { family: tokenRow.family, usedAt: IsNull() },
          { usedAt: new Date() }
        );
        await mgr.increment(User, { id: user.id }, 'tokenVersion', 1);
      });
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }

    // Happy path: mark the old row used and issue a successor in the same family.
    return this.dataSource.transaction(async (mgr) => {
      const newJti = uuid();
      const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
      const expiresAt = new Date(Date.now() + durationToMs(refreshExpiresIn));

      // Persist successor first so we can record `replacedById` on the parent.
      const successor = await mgr.save(RefreshToken, {
        jti: newJti,
        userId: user.id,
        family: tokenRow.family,
        expiresAt,
      });

      await mgr.update(
        RefreshToken,
        { id: tokenRow.id },
        { usedAt: new Date(), replacedById: successor.id }
      );

      return this.signTokenPair(user, newJti, tokenRow.family);
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH.USER_NOT_FOUND);
    }

    const isCurrentPasswordValid = await compare(dto.currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new BadRequestException(ErrorMessages.AUTH.CURRENT_PASSWORD_INCORRECT);
    }

    user.password = await hash(dto.newPassword, 10);
    await this.userRepository.save(user);

    // SECURITY: Invalidate all existing JWTs (access + refresh) issued before
    // this password change. Without this, a compromised token remains valid
    // for its full TTL even after the user rotates their password — defeating
    // the purpose of the password change.
    await this.invalidateTokens(userId);
  }

  /**
   * Invalidate all existing tokens for a user.
   *
   * - Bumps `tokenVersion` so every JWT carrying the old version is rejected
   *   by `refreshToken()` (and JwtStrategy.validate, if it checks the same).
   * - Marks every still-valid refresh-token row for the user as used, so
   *   even tokens that were never presented before cannot be redeemed after
   *   logout / password change.
   */
  async invalidateTokens(userId: string): Promise<void> {
    await this.dataSource.transaction(async (mgr) => {
      await mgr.increment(User, { id: userId }, 'tokenVersion', 1);
      await mgr.update(RefreshToken, { userId, usedAt: IsNull() }, { usedAt: new Date() });
    });
  }

  /**
   * Issues a fresh token family (login / register / legacy-refresh upgrade).
   * Persists the refresh-token row and signs the JWT pair carrying its `jti`.
   */
  private async generateTokens(user: User): Promise<AuthResponseDto> {
    const family = uuid();
    const jti = uuid();
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = new Date(Date.now() + durationToMs(refreshExpiresIn));

    await this.refreshTokenRepository.save({
      jti,
      userId: user.id,
      family,
      expiresAt,
    });

    return this.signTokenPair(user, jti, family);
  }

  /**
   * Signs the access + refresh JWT pair for a given persisted `jti`/`family`.
   * Used by both fresh logins and refresh rotations.
   */
  private signTokenPair(user: User, jti: string, family: string): AuthResponseDto {
    const accessPayload: Record<string, string | number | null> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tokenVersion: user.tokenVersion,
    };

    const refreshPayload: Record<string, string | number | null> = {
      ...accessPayload,
      jti,
      family,
    };

    const accessToken = this.accessJwtService.sign(accessPayload);
    const refreshToken = this.refreshJwtService.sign(refreshPayload);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: this.toUserDto(user),
    };
  }

  private toUserDto(user: User): UserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId,
    };
  }
}
