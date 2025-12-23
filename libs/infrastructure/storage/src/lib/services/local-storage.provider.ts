import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  StorageProvider,
  StorageResult,
} from '../interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;
  private readonly urlPrefix: string;

  constructor(private configService: ConfigService) {
    this.basePath = path.resolve(
      this.configService.get<string>('STORAGE_LOCAL_PATH', './uploads')
    );
    this.urlPrefix = this.configService.get<string>(
      'STORAGE_LOCAL_URL',
      '/uploads'
    );

    // Ensure base directory exists (sync ok during startup)
    this.ensureDirectoryExistsSync(this.basePath);
  }

  /**
   * Sanitize and validate a path to prevent directory traversal attacks
   * @param userPath The user-provided path component
   * @returns The sanitized absolute path
   * @throws BadRequestException if path traversal is detected
   */
  private sanitizePath(userPath: string): string {
    // Remove null bytes and normalize path separators
    const sanitized = userPath.replace(/\0/g, '').replace(/\\/g, '/');

    // Resolve the full path
    const fullPath = path.resolve(this.basePath, sanitized);

    // Ensure the resolved path is within basePath
    if (!fullPath.startsWith(this.basePath + path.sep) && fullPath !== this.basePath) {
      this.logger.warn(
        `Path traversal attempt detected: ${userPath} -> ${fullPath}`
      );
      throw new BadRequestException('Invalid file path');
    }

    return fullPath;
  }

  /**
   * Synchronous directory creation - used only during constructor initialization
   */
  private ensureDirectoryExistsSync(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.logger.log(`Created storage directory: ${dirPath}`);
    }
  }

  /**
   * Async directory creation - used for runtime operations
   */
  private async ensureDirectoryExistsAsync(dirPath: string): Promise<void> {
    try {
      await fsPromises.access(dirPath);
    } catch {
      await fsPromises.mkdir(dirPath, { recursive: true });
      this.logger.log(`Created storage directory: ${dirPath}`);
    }
  }

  async upload(
    file: Express.Multer.File,
    subPath: string
  ): Promise<StorageResult> {
    // Sanitize the subPath to prevent directory traversal
    const sanitizedDir = this.sanitizePath(subPath);

    const ext = path.extname(file.originalname);
    const fileName = `${uuidv4()}${ext}`;
    const filePath = path.join(sanitizedDir, fileName);

    // Double-check the final path is still within basePath
    if (!filePath.startsWith(this.basePath + path.sep)) {
      throw new BadRequestException('Invalid file path');
    }

    await this.ensureDirectoryExistsAsync(sanitizedDir);

    try {
      await fsPromises.writeFile(filePath, file.buffer);

      const relativePath = path.relative(this.basePath, filePath);
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
    // Sanitize the filePath to prevent directory traversal
    const fullPath = this.sanitizePath(filePath);

    try {
      await fsPromises.access(fullPath);
      await fsPromises.unlink(fullPath);
      this.logger.log(`File deleted: ${filePath}`);
      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // File doesn't exist or other error
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      this.logger.error(`Failed to delete file: ${filePath}`, error);
      return false;
    }
  }

  async getUrl(filePath: string): Promise<string> {
    // Validate path even for URL generation
    this.sanitizePath(filePath);
    return `${this.urlPrefix}/${filePath.replace(/\\/g, '/')}`;
  }

  async getSignedUrl(filePath: string, _expiresIn?: number): Promise<string> {
    // Local storage doesn't support signed URLs, return regular URL
    return this.getUrl(filePath);
  }

  async exists(filePath: string): Promise<boolean> {
    // Sanitize the filePath to prevent directory traversal
    const fullPath = this.sanitizePath(filePath);
    try {
      await fsPromises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }
}
