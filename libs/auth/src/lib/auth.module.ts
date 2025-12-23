import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtModuleOptions, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, Company } from '@accounting/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ACCESS_JWT_SERVICE, REFRESH_JWT_SERVICE } from './constants/jwt.constants';

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
          secret: configService.get<string>('JWT_SECRET') || 'secret',
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
          secret: configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret',
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
          secret: configService.get<string>('JWT_SECRET') || 'secret',
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
          secret: configService.get<string>('JWT_REFRESH_SECRET') || 'refresh-secret',
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
