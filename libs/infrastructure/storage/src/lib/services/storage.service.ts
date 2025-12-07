import { Injectable, Inject, Logger } from '@nestjs/common';
import { StorageProvider, StorageResult, STORAGE_PROVIDER } from '../interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: StorageProvider,
  ) {}

  async uploadFile(file: Express.Multer.File, path: string): Promise<StorageResult> {
    this.logger.log(`Uploading file: ${file.originalname} to ${path}`);
    return this.provider.upload(file, path);
  }

  async deleteFile(path: string): Promise<boolean> {
    this.logger.log(`Deleting file: ${path}`);
    return this.provider.delete(path);
  }

  async getFileUrl(path: string): Promise<string> {
    return this.provider.getUrl(path);
  }

  async getSignedUrl(path: string, expiresIn?: number): Promise<string> {
    return this.provider.getSignedUrl(path, expiresIn);
  }

  async fileExists(path: string): Promise<boolean> {
    return this.provider.exists(path);
  }

  // Convenience methods for specific directories
  async uploadIcon(file: Express.Multer.File, companyId: string): Promise<StorageResult> {
    return this.uploadFile(file, `icons/${companyId}`);
  }

  async uploadClientDocument(
    file: Express.Multer.File,
    companyId: string,
    clientId: string,
  ): Promise<StorageResult> {
    return this.uploadFile(file, `clients/${companyId}/${clientId}/documents`);
  }
}
