import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';

import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';

import { Company, User, UserRole } from '@accounting/common';

import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from '../constants/jwt.constants';
import { AuthResponseDto, UserDto } from '../dto/auth-response.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @Inject(ACCESS_JWT_SERVICE)
    private accessJwtService: JwtService,
    @Inject(REFRESH_JWT_SERVICE)
    private refreshJwtService: JwtService
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email: registerDto.email })
      .getOne();

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate companyId for COMPANY_OWNER and EMPLOYEE
    if (
      (registerDto.role === UserRole.COMPANY_OWNER || registerDto.role === UserRole.EMPLOYEE) &&
      !registerDto.companyId
    ) {
      throw new BadRequestException('companyId is required for COMPANY_OWNER and EMPLOYEE roles');
    }

    // Validate company exists if companyId is provided
    if (registerDto.companyId) {
      const company = await this.companyRepository.findOne({
        where: { id: registerDto.companyId },
      });
      if (!company) {
        throw new BadRequestException('Company not found');
      }
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: registerDto.role,
      companyId: registerDto.companyId || null,
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    return this.generateTokens(savedUser);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
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
    const isPasswordValid = await bcrypt.compare(password, hashToCompare);

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
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepository.save(user);
  }

  private generateTokens(user: User): AuthResponseDto {
    const payload: Record<string, string | null> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
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
