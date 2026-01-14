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
    const fileName = `${user.companyId}/email-attachments/${timestamp}-${sanitized}`;

    await this.storageService.uploadFile(fileName, file.buffer, {
      contentType: file.mimetype,
      metadata: { userId: user.id, companyId: user.companyId, originalName: file.originalname },
    });

    this.logger.log(`Attachment uploaded: ${fileName}`);
    return fileName;
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
