import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { StorageProvider, StorageResult } from '../interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;
  private readonly urlPrefix: string;

  constructor(private configService: ConfigService) {
    this.basePath = this.configService.get<string>('STORAGE_LOCAL_PATH', './uploads');
    this.urlPrefix = this.configService.get<string>('STORAGE_LOCAL_URL', '/uploads');

    // Ensure base directory exists
    this.ensureDirectoryExists(this.basePath);
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created storage directory: ${dirPath}`);
    }
  }

  async upload(file: Express.Multer.File, subPath: string): Promise<StorageResult> {
    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const fullPath = path.join(this.basePath, subPath);
    const filePath = path.join(fullPath, fileName);

    this.ensureDirectoryExists(fullPath);

    try {
      fs.writeFileSync(filePath, file.buffer);

      const relativePath = path.join(subPath, fileName);
      const url = `${this.urlPrefix}/${relativePath.replace(/\\/g, '/')}`;

      this.logger.log(`File uploaded: ${relativePath}`);

      return {
        path: relativePath,
        url,
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${file.originalname}`, error);
      throw error;
    }
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, filePath);

    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        this.logger.log(`File deleted: ${filePath}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  async getUrl(filePath: string): Promise<string> {
    return `${this.urlPrefix}/${filePath.replace(/\\/g, '/')}`;
  }

  async getSignedUrl(filePath: string, _expiresIn?: number): Promise<string> {
    // Local storage doesn't support signed URLs, return regular URL
    return this.getUrl(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.basePath, filePath);
    return fs.existsSync(fullPath);
  }
}
