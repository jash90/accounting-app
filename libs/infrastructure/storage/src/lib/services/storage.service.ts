import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  STORAGE_PROVIDER,
  StorageProvider,
  StorageResult,
} from '../interfaces/storage-provider.interface';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: StorageProvider
  ) {}

  async uploadFile(file: Express.Multer.File, path: string): Promise<StorageResult> {
    this.logger.log(`Uploading file: ${file.originalname} to ${path}`);
    return this.provider.upload(file, path);
  }

  /**
   * Upload a buffer as a file to storage
   * Creates a mock Multer file object from the buffer
   */
  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    path: string,
    mimeType: string = 'application/octet-stream'
  ): Promise<StorageResult> {
    this.logger.log(`Uploading buffer as file: ${fileName} to ${path}`);

    // Create a mock Multer file object
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: mimeType,
      size: buffer.length,
      buffer,
      destination: '',
      filename: fileName,
      path: '',
      stream: undefined as unknown as Express.Multer.File['stream'],
    };

    return this.provider.upload(mockFile, path);
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

  async downloadFile(path: string): Promise<Buffer> {
    this.logger.log(`Downloading file: ${path}`);
    return this.provider.download(path);
  }

  // Convenience methods for specific directories
  async uploadIcon(file: Express.Multer.File, companyId: string): Promise<StorageResult> {
    return this.uploadFile(file, `icons/${companyId}`);
  }

  async uploadClientDocument(
    file: Express.Multer.File,
    companyId: string,
    clientId: string
  ): Promise<StorageResult> {
    return this.uploadFile(file, `clients/${companyId}/${clientId}/documents`);
  }
}
