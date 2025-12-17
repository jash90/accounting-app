/**
 * DTO for email configuration response
 * Excludes encrypted passwords for security
 */
export class EmailConfigResponseDto {
  id!: string;

  // SMTP Configuration (without password)
  smtpHost!: string;
  smtpPort!: number;
  smtpSecure!: boolean;
  smtpUser!: string;

  // IMAP Configuration (without password)
  imapHost!: string;
  imapPort!: number;
  imapTls!: boolean;
  imapUser!: string;

  // Metadata
  displayName?: string;
  isActive!: boolean;

  // Ownership
  userId?: string | null;
  companyId?: string | null;

  // Timestamps
  createdAt!: Date;
  updatedAt!: Date;

  /**
   * Create response DTO from entity
   * Excludes encrypted passwords
   */
  static fromEntity(entity: {
    id: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    imapHost: string;
    imapPort: number;
    imapTls: boolean;
    imapUser: string;
    displayName?: string;
    isActive: boolean;
    userId?: string | null;
    companyId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): EmailConfigResponseDto {
    const dto = new EmailConfigResponseDto();
    dto.id = entity.id;
    dto.smtpHost = entity.smtpHost;
    dto.smtpPort = entity.smtpPort;
    dto.smtpSecure = entity.smtpSecure;
    dto.smtpUser = entity.smtpUser;
    dto.imapHost = entity.imapHost;
    dto.imapPort = entity.imapPort;
    dto.imapTls = entity.imapTls;
    dto.imapUser = entity.imapUser;
    dto.displayName = entity.displayName;
    dto.isActive = entity.isActive;
    dto.userId = entity.userId;
    dto.companyId = entity.companyId;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
