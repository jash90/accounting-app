import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserRole, Company } from '@accounting/common';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto, UserDto } from '../dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private jwtService: JwtService,
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
      (registerDto.role === UserRole.COMPANY_OWNER ||
        registerDto.role === UserRole.EMPLOYEE) &&
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
    console.log('🔍 [AUTH DEBUG] validateUser called with:', {
      email,
      passwordLength: password?.length,
      passwordPreview: password?.substring(0, 5) + '***'
    });

    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();

    console.log('👤 [AUTH DEBUG] User found:', user ? {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      role: user.role,
      hasPassword: !!user.password,
      passwordHashPreview: user.password?.substring(0, 10) + '...'
    } : 'null - USER NOT FOUND');

    if (!user) {
      console.log('❌ [AUTH DEBUG] Returning null - user not found');
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    console.log('🔐 [AUTH DEBUG] Password comparison result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ [AUTH DEBUG] Returning null - invalid password');
      return null;
    }

    console.log('✅ [AUTH DEBUG] User validated successfully');
    return user;
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private generateTokens(user: User): AuthResponseDto {
    const payload: Record<string, any> = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };

    const accessToken = this.jwtService.sign(payload);

    // Note: Using same secret for refresh token for simplicity
    // In production, consider using a separate JwtService instance configured with refresh secret
    const refreshToken = this.jwtService.sign(payload);

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

