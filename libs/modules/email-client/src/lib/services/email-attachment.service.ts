import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { User } from '@accounting/common';
import { StorageService } from '@accounting/infrastructure/storage';

@Injectable()
export class EmailAttachmentService {
  private readonly logger = new Logger(EmailAttachmentService.name);
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  constructor(private readonly storageService: StorageService) {}

  async uploadAttachment(user: User, file: Express.Multer.File): Promise<string> {
    if (!user.companyId) {
      throw new BadRequestException('User must belong to a company');
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File too large. Max: ${this.MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const subPath = `${user.companyId}/email-attachments`;

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

  async downloadAttachment(user: User, filePath: string): Promise<{ buffer: Buffer; filename: string }> {
    if (!user.companyId || !filePath.startsWith(user.companyId)) {
      throw new BadRequestException('Access denied');
    }

    const buffer = await this.storageService.downloadFile(filePath);
    const filename = filePath.split('/').pop() || 'download';

    return { buffer, filename };
  }
}
