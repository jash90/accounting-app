import { Module, Global, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from './services/storage.service';
import { LocalStorageProvider } from './services/local-storage.provider';
import { S3StorageProvider } from './services/s3-storage.provider';
import { STORAGE_PROVIDER } from './interfaces/storage-provider.interface';

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
