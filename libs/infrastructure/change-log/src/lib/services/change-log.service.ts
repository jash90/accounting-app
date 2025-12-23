import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeLog, ChangeAction, User } from '@accounting/common';

export interface ChangeDetail {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// Fields that should be redacted from change logs for security
const SENSITIVE_FIELDS = new Set([
  // Authentication & credentials
  'password',
  'passwordHash',
  'hashedPassword',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'salt',
  'secret',
  'apiKey',
  'apiSecret',
  'accessToken',
  'refreshToken',
  'token',
  'authToken',
  'bearerToken',
  'jwtSecret',
  'privateKey',
  'publicKey',
  'encryptionKey',
  'decryptionKey',
  'masterKey',
  'secretKey',
  // SMTP/Email credentials
  'smtpPassword',
  'emailPassword',
  'imapPassword',
  // OAuth
  'clientSecret',
  'oauthToken',
  'oauthSecret',
  // Financial/sensitive PII
  'ssn',
  'socialSecurityNumber',
  'taxId',
  'bankAccountNumber',
  'creditCardNumber',
  'cvv',
  'pin',
  // Two-factor auth
  'totpSecret',
  'backupCodes',
  'recoveryCode',
  'mfaSecret',
  '2faSecret',
]);

// Patterns for detecting sensitive field names (case-insensitive)
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /credential/i,
  /auth[_-]?key/i,
];

const REDACTED_VALUE = '[REDACTED]';

@Injectable()
export class ChangeLogService {
  private readonly logger = new Logger(ChangeLogService.name);

  constructor(
    @InjectRepository(ChangeLog)
    private changeLogRepository: Repository<ChangeLog>,
  ) {}

  async logCreate(
    entityType: string,
    entityId: string,
    data: Record<string, unknown>,
    user: User,
  ): Promise<ChangeLog> {
    const changes: ChangeDetail[] = Object.entries(data).map(([field, value]) => ({
      field,
      oldValue: null,
      newValue: value,
    }));

    return this.createLog(entityType, entityId, ChangeAction.CREATE, changes, user);
  }

  async logUpdate(
    entityType: string,
    entityId: string,
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
    user: User,
  ): Promise<ChangeLog | null> {
    const changes = this.calculateChanges(oldData, newData);

    if (changes.length === 0) {
      this.logger.debug(`No changes detected for ${entityType}:${entityId}`);
      return null;
    }

    return this.createLog(entityType, entityId, ChangeAction.UPDATE, changes, user);
  }

  async logDelete(
    entityType: string,
    entityId: string,
    data: Record<string, unknown>,
    user: User,
  ): Promise<ChangeLog> {
    const changes: ChangeDetail[] = Object.entries(data).map(([field, value]) => ({
      field,
      oldValue: value,
      newValue: null,
    }));

    return this.createLog(entityType, entityId, ChangeAction.DELETE, changes, user);
  }

  /**
   * Check if a field name contains sensitive data that should be redacted
   */
  private isSensitiveField(fieldName: string): boolean {
    // Check exact matches first (case-insensitive)
    if (SENSITIVE_FIELDS.has(fieldName) || SENSITIVE_FIELDS.has(fieldName.toLowerCase())) {
      return true;
    }

    // Check pattern matches
    return SENSITIVE_PATTERNS.some((pattern) => pattern.test(fieldName));
  }

  private calculateChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>,
  ): ChangeDetail[] {
    const changes: ChangeDetail[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      const oldValue = oldData[key];
      const newValue = newData[key];

      // Skip internal fields
      if (['id', 'createdAt', 'updatedAt', 'createdById', 'companyId'].includes(key)) {
        continue;
      }

      // Compare values
      if (!this.areEqual(oldValue, newValue)) {
        // Redact sensitive fields
        if (this.isSensitiveField(key)) {
          changes.push({
            field: key,
            oldValue: oldValue != null ? REDACTED_VALUE : null,
            newValue: newValue != null ? REDACTED_VALUE : null,
          });
        } else {
          changes.push({
            field: key,
            oldValue: this.sanitizeValue(oldValue),
            newValue: this.sanitizeValue(newValue),
          });
        }
      }
    }

    return changes;
  }

  private areEqual(a: unknown, b: unknown): boolean {
    // Handle null/undefined
    if (a === null && b === null) return true;
    if (a === undefined && b === undefined) return true;
    if (a === null || a === undefined || b === null || b === undefined) return false;

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    // Handle arrays with deep comparison
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => this.areEqual(item, b[index]));
    }

    // Handle objects with order-independent deep comparison
    if (typeof a === 'object' && typeof b === 'object') {
      // Different types (e.g., array vs plain object)
      if (Array.isArray(a) !== Array.isArray(b)) return false;

      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;
      const keysA = Object.keys(objA);
      const keysB = Object.keys(objB);

      if (keysA.length !== keysB.length) return false;

      return keysA.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(objB, key) &&
          this.areEqual(objA[key], objB[key]),
      );
    }

    return a === b;
  }

  private sanitizeValue(value: unknown): unknown {
    // Don't log sensitive fields
    if (value === undefined) return null;

    // Convert dates to ISO strings
    if (value instanceof Date) {
      return value.toISOString();
    }

    return value;
  }

  private async createLog(
    entityType: string,
    entityId: string,
    action: ChangeAction,
    changes: ChangeDetail[],
    user: User,
  ): Promise<ChangeLog> {
    const log = this.changeLogRepository.create({
      entityType,
      entityId,
      action,
      changes,
      changedById: user.id,
    });

    const saved = await this.changeLogRepository.save(log);

    this.logger.log(
      `Change logged: ${action} ${entityType}:${entityId} by user:${user.id} (${changes.length} changes)`,
    );

    return saved;
  }

  async getChangeLogs(
    entityType: string,
    entityId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ logs: ChangeLog[]; total: number }> {
    const [logs, total] = await this.changeLogRepository.findAndCount({
      where: { entityType, entityId },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });

    return { logs, total };
  }

  async getCompanyChangeLogs(
    entityType: string,
    companyId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ logs: ChangeLog[]; total: number }> {
    // Join with changedBy user to filter by company
    const query = this.changeLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.changedBy', 'user')
      .where('log.entityType = :entityType', { entityType })
      .andWhere('user.companyId = :companyId', { companyId })
      .orderBy('log.createdAt', 'DESC')
      .take(options?.limit || 50)
      .skip(options?.offset || 0);

    const [logs, total] = await query.getManyAndCount();

    return { logs, total };
  }

  async getRecentChanges(
    entityType: string,
    companyId?: string,
    limit = 20,
  ): Promise<ChangeLog[]> {
    const query = this.changeLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.changedBy', 'user')
      .where('log.entityType = :entityType', { entityType })
      .orderBy('log.createdAt', 'DESC')
      .take(limit);

    if (companyId) {
      // Filter by the company of the user who made the change to enforce tenant isolation
      query.andWhere('user.companyId = :companyId', { companyId });
    }

    return query.getMany();
  }

  // Format change for display
  formatChange(change: ChangeDetail): { field: string; oldValue: string; newValue: string } {
    return {
      field: this.formatFieldName(change.field),
      oldValue: this.formatValue(change.oldValue),
      newValue: this.formatValue(change.newValue),
    };
  }

  private formatFieldName(field: string): string {
    // Convert camelCase to readable format
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '(brak)';
    }

    if (typeof value === 'boolean') {
      return value ? 'Tak' : 'Nie';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }
}
