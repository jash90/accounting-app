import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as path from 'path';

import { User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import { StorageService } from '@accounting/infrastructure/storage';


@Injectable()
export class EmailAttachmentService {
  private readonly logger = new Logger(EmailAttachmentService.name);
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly basePath: string;

  constructor(
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly systemCompanyService: SystemCompanyService
  ) {
    this.basePath = path.resolve(this.configService.get<string>('STORAGE_LOCAL_PATH', './uploads'));
  }

  async uploadAttachment(user: User, file: Express.Multer.File): Promise<string> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Max: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const subPath = `${companyId}/email-attachments`;

    // Reconstruct Express.Multer.File object with all required properties
    const multerFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
      stream: null as any,
      destination: '',
      filename: `${timestamp}-${sanitized}`,
      path: '',
    };

    // Upload using correct StorageService signature
    const result = await this.storageService.uploadFile(multerFile, subPath);

    this.logger.log(`Attachment uploaded: ${result.path}`);
    return result.path;
  }

  async downloadAttachment(
    user: User,
    filePath: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    if (!filePath.startsWith(companyId)) {
      throw new BadRequestException('Access denied');
    }

    const buffer = await this.storageService.downloadFile(filePath);
    const filename = filePath.split('/').pop() || 'download';

    return { buffer, filename };
  }

  /**
   * Get absolute path for a relative storage path.
   * Used by nodemailer to attach files from local storage.
   */
  getAbsolutePath(relativePath: string): string {
    return path.resolve(this.basePath, relativePath);
  }
}
