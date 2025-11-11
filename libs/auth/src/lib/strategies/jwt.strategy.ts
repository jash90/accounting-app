import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@accounting/common';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET') || 'secret';
    console.log('🔧 [JWT STRATEGY] Initializing with JWT_SECRET:',
      jwtSecret === 'secret' ? '⚠️  Using default "secret" (not secure for production!)' : '✅ Custom secret loaded'
    );

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    console.log('🔐 [JWT STRATEGY] Token received and decoded successfully');
    console.log('📦 [JWT STRATEGY] Token payload:', {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
      iat: (payload as any).iat,
      exp: (payload as any).exp,
      expiresAt: (payload as any).exp ? new Date((payload as any).exp * 1000).toISOString() : 'N/A'
    });

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    console.log('👤 [JWT STRATEGY] User lookup result:', user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      isActive: user.isActive
    } : '❌ null - USER NOT FOUND IN DATABASE');

    if (!user) {
      console.log('❌ [JWT STRATEGY] Validation FAILED: User not found');
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      console.log('❌ [JWT STRATEGY] Validation FAILED: User account is inactive');
      throw new UnauthorizedException('User account is inactive');
    }

    console.log('✅ [JWT STRATEGY] Validation SUCCESSFUL - User authenticated');
    return user;
  }
}

