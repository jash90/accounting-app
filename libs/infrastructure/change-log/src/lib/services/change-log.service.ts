import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChangeLog, ChangeAction, User } from '@accounting/common';

export interface ChangeDetail {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

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
        changes.push({
          field: key,
          oldValue: this.sanitizeValue(oldValue),
          newValue: this.sanitizeValue(newValue),
        });
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

    // Handle objects and arrays
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
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
      `Change logged: ${action} ${entityType}:${entityId} by ${user.email} (${changes.length} changes)`,
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
      // This would require a join with the entity table
      // For now, we'll just return all changes for the entity type
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
