import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';

import { Company, ErrorMessages, User, UserRole } from '@accounting/common';

import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from '../constants/jwt.constants';
import { AuthResponseDto, UserDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @Inject(ACCESS_JWT_SERVICE)
    private readonly accessJwtService: JwtService,
    @Inject(REFRESH_JWT_SERVICE)
    private readonly refreshJwtService: JwtService
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

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      // Verify refresh token using the refresh JWT service with the correct secret
      const payload = this.refreshJwtService.verify(refreshToken);

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
      }

      // FIX-04: Reject tokens issued before logout/password change
      if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
      }

      return this.generateTokens(user);
    } catch (error) {
      // Re-throw UnauthorizedException as-is, wrap others
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(ErrorMessages.AUTH.INVALID_REFRESH_TOKEN);
    }
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
  }

  /**
   * Invalidate all existing tokens for a user by incrementing tokenVersion.
   * Tokens issued before this increment will be rejected by JwtStrategy.validate().
   */
  async invalidateTokens(userId: string): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
  }

  private generateTokens(user: User): AuthResponseDto {
    const payload: Record<string, string | number | null> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      tokenVersion: user.tokenVersion,
    };

    // Generate access token with shorter expiration (15m)
    const accessToken = this.accessJwtService.sign(payload);

    // Generate refresh token with longer expiration (7d) and different secret
    const refreshToken = this.refreshJwtService.sign(payload);

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
