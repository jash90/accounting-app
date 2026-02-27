import { ConfigModule, ConfigService } from '@nestjs/config';
import type { JwtModuleAsyncOptions } from '@nestjs/jwt';

export function createJwtModuleConfig(): JwtModuleAsyncOptions {
  return {
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      secret: configService.get<string>('JWT_SECRET'),
      // eslint_disable-next-line @typescript-eslint/no-explicit-any
      signOptions: { expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '1d') as any },
    }),
    inject: [ConfigService],
  };
}
