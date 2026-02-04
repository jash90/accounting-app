import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';
import { LocalStorageProvider } from './services/local-storage.provider';
import { S3StorageProvider } from './services/s3-storage.provider';
import { StorageService } from './services/storage.service';

@Global()
@Module({})
export class StorageModule {
  static forRoot(): DynamicModule {
    return {
      module: StorageModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: STORAGE_PROVIDER,
          useFactory: (configService: ConfigService) => {
            const storageType = configService.get<string>('STORAGE_TYPE', 'local');
            const validTypes = ['local', 's3'];

            if (!validTypes.includes(storageType)) {
              console.warn(
                `Invalid STORAGE_TYPE "${storageType}". Valid options: ${validTypes.join(', ')}. Defaulting to "local".`
              );
            }

            if (storageType === 's3') {
              return new S3StorageProvider(configService);
            }

            return new LocalStorageProvider(configService);
          },
          inject: [ConfigService],
        },
        StorageService,
      ],
      exports: [StorageService, STORAGE_PROVIDER],
    };
  }
}
