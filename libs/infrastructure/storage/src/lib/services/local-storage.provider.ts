import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { promises as fsPromises } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

import { StorageProvider, StorageResult } from '../interfaces/storage-provider.interface';

@Injectable()
export class LocalStorageProvider implements StorageProvider, OnModuleInit {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly basePath: string;
  private readonly urlPrefix: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = path.resolve(this.configService.get<string>('STORAGE_LOCAL_PATH', './uploads'));
    this.urlPrefix = this.configService.get<string>('STORAGE_LOCAL_URL', '/uploads');
  }

  async onModuleInit(): Promise<void> {
    await this.ensureDirectoryExistsAsync(this.basePath);
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
      this.logger.warn(`Path traversal attempt detected: ${userPath} -> ${fullPath}`);
      throw new BadRequestException('Invalid file path');
    }

    return fullPath;
  }

  /**
   * Async directory creation - used for startup and runtime operations
   */
  private async ensureDirectoryExistsAsync(dirPath: string): Promise<void> {
    try {
      await fsPromises.access(dirPath);
    } catch {
      await fsPromises.mkdir(dirPath, { recursive: true });
      this.logger.log(`Created storage directory: ${dirPath}`);
    }
  }

  async upload(file: Express.Multer.File, subPath: string): Promise<StorageResult> {
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

  getUrl(filePath: string): Promise<string> {
    // Validate and sanitize path - use sanitized path for security
    const fullPath = this.sanitizePath(filePath);
    const relativePath = path.relative(this.basePath, fullPath);
    return Promise.resolve(`${this.urlPrefix}/${relativePath.replace(/\\/g, '/')}`);
  }

  getSignedUrl(filePath: string, _expiresIn?: number): Promise<string> {
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

  async download(filePath: string): Promise<Buffer> {
    // Sanitize the filePath to prevent directory traversal
    const fullPath = this.sanitizePath(filePath);

    try {
      await fsPromises.access(fullPath);
      const buffer = await fsPromises.readFile(fullPath);
      this.logger.log(`File downloaded: ${filePath}`);
      return buffer;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new BadRequestException(`File not found: ${filePath}`);
      }
      this.logger.error(`Failed to download file: ${filePath}`, error);
      throw error;
    }
  }
}
