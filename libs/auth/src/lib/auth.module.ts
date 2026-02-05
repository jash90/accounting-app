import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Company, User } from '@accounting/common';

import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from './constants/jwt.constants';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

function getRequiredSecret(configService: ConfigService, key: string): string {
  const secret = configService.get<string>(key);
  if (!secret) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `JWT secrets must be explicitly configured for security. ` +
        `Please set ${key} in your environment or .env file.`
    );
  }
  return secret;
}

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company]),
    PassportModule,
    // Access Token JwtModule - shorter expiration, used for API access
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '15m';
        return {
          secret: getRequiredSecret(configService, 'JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
    // Refresh Token JwtModule - longer expiration, separate secret
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
        return {
          secret: getRequiredSecret(configService, 'JWT_REFRESH_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Provide named JwtService instances for dependency injection
    {
      provide: ACCESS_JWT_SERVICE,
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '15m';
        return new JwtService({
          secret: getRequiredSecret(configService, 'JWT_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: REFRESH_JWT_SERVICE,
      useFactory: (configService: ConfigService) => {
        const expiresIn = configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
        return new JwtService({
          secret: getRequiredSecret(configService, 'JWT_REFRESH_SECRET'),
          signOptions: {
            expiresIn: expiresIn as any,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [AuthService, ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE],
})
export class AuthModule {}
