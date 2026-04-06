
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import { randomUUID } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';

import { applyUpdate, Client, isValidPkdCode, User } from '@accounting/common';
import { sanitizeForLog, SystemCompanyService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { CLIENT_VALIDATION_MESSAGES } from '../constants';
import { ClientChangelogService } from './client-changelog.service';
import {
  BulkDeleteClientsDto,
  BulkEditClientsDto,
  BulkOperationResultDto,
  BulkRestoreClientsDto,
} from '../dto/bulk-operations.dto';

/**
 * Handles bulk operations on clients (delete, restore, edit).
 * Extracted from ClientsService to keep files under 500 lines.
 * All operations use transactions for atomicity and include bulk audit trail correlation.
 */
@Injectable()
export class ClientBulkService {
  private readonly logger = new Logger(ClientBulkService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly changeLogService: ChangeLogService,
    private readonly clientChangelogService: ClientChangelogService,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  /**
   * Bulk delete (soft delete) multiple clients.
   * Uses transaction to ensure atomicity - all clients are deleted or none.
   * Includes bulk operation ID for audit trail correlation.
   */
  async bulkDelete(dto: BulkDeleteClientsDto, user: User): Promise<BulkOperationResultDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const bulkOperationId = randomUUID();

    return this.dataSource.transaction(async (manager) => {
      const clientRepo = manager.getRepository(Client);

      // Get clients that belong to this company and are active
      const clients = await clientRepo.find({
        where: {
          id: In(dto.clientIds),
          companyId,
          isActive: true,
        },
      });

      if (clients.length === 0) {
        return { affected: 0, requested: dto.clientIds.length, bulkOperationId };
      }

      // Collect old values for changelog before mutation
      const changelogEntries = clients.map((client) => ({
        entityId: client.id,
        data: {
          ...this.sanitizeClientForLog(client),
          _bulkOperationId: bulkOperationId,
        },
      }));

      // Batch update all clients
      for (const client of clients) {
        client.isActive = false;
        client.updatedById = user.id;
      }
      await clientRepo.save(clients);

      // Batch log all deletions in a single database call
      await this.changeLogService.logBulkDelete('Client', changelogEntries, user);

      // Batch notify about all deleted clients
      await this.clientChangelogService.notifyBulkClientsDeleted(clients, user);

      this.logger.log(`Bulk deleted ${clients.length} clients`, {
        companyId,
        userId: user.id,
        clientIds: clients.map((c) => c.id),
        bulkOperationId,
      });

      return { affected: clients.length, requested: dto.clientIds.length, bulkOperationId };
    });
  }

  /**
   * Bulk restore multiple deleted clients.
   * Uses transaction to ensure atomicity - all clients are restored or none.
   * Includes bulk operation ID for audit trail correlation.
   */
  async bulkRestore(dto: BulkRestoreClientsDto, user: User): Promise<BulkOperationResultDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const bulkOperationId = randomUUID();

    return this.dataSource.transaction(async (manager) => {
      const clientRepo = manager.getRepository(Client);

      // Get clients that belong to this company and are inactive
      const clients = await clientRepo.find({
        where: {
          id: In(dto.clientIds),
          companyId,
          isActive: false,
        },
      });

      if (clients.length === 0) {
        return { affected: 0, requested: dto.clientIds.length, bulkOperationId };
      }

      // Collect old values for changelog before mutation
      const oldValuesMap = new Map<string, Record<string, unknown>>();
      for (const client of clients) {
        oldValuesMap.set(client.id, this.sanitizeClientForLog(client));
      }

      // Batch update all clients
      for (const client of clients) {
        client.isActive = true;
        client.updatedById = user.id;
      }
      await clientRepo.save(clients);

      // Prepare changelog entries with old and new values
      // Note: Non-null assertion is safe here because oldValuesMap is populated
      // from the same `clients` array being iterated - every client.id has an entry.
      const changelogEntries = clients.map((client) => ({
        entityId: client.id,
        oldData: {
          ...oldValuesMap.get(client.id)!,
          _bulkOperationId: bulkOperationId,
        },
        newData: {
          ...this.sanitizeClientForLog(client),
          _bulkOperationId: bulkOperationId,
        },
      }));

      // Batch log all updates in a single database call
      await this.changeLogService.logBulkUpdate('Client', changelogEntries, user);

      this.logger.log(`Bulk restored ${clients.length} clients`, {
        companyId,
        userId: user.id,
        clientIds: clients.map((c) => c.id),
        bulkOperationId,
      });

      return { affected: clients.length, requested: dto.clientIds.length, bulkOperationId };
    });
  }

  /**
   * Bulk edit multiple clients with the same values.
   * Uses transaction to ensure atomicity - all clients are updated or none.
   * Includes bulk operation ID for audit trail correlation.
   */
  async bulkEdit(dto: BulkEditClientsDto, user: User): Promise<BulkOperationResultDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
    const bulkOperationId = randomUUID();

    // Normalize and validate PKD code if provided (before building payload)
    let normalizedPkdCode = dto.pkdCode?.trim();
    if (normalizedPkdCode === '') {
      normalizedPkdCode = undefined;
    }
    if (normalizedPkdCode && !isValidPkdCode(normalizedPkdCode)) {
      throw new BadRequestException(
        `${CLIENT_VALIDATION_MESSAGES.INVALID_PKD_CODE}: ${normalizedPkdCode}`
      );
    }

    // Build update payload from non-undefined values (outside transaction for validation)
    const updatePayload: Partial<Client> = {};
    if (dto.employmentType !== undefined) updatePayload.employmentType = dto.employmentType;
    if (dto.vatStatus !== undefined) updatePayload.vatStatus = dto.vatStatus;
    if (dto.taxScheme !== undefined) updatePayload.taxScheme = dto.taxScheme;
    if (dto.zusStatus !== undefined) updatePayload.zusStatus = dto.zusStatus;
    if (dto.receiveEmailCopy !== undefined) updatePayload.receiveEmailCopy = dto.receiveEmailCopy;
    if (dto.pkdCode !== undefined) updatePayload.pkdCode = normalizedPkdCode;

    if (Object.keys(updatePayload).length === 0) {
      return { affected: 0, requested: dto.clientIds.length, bulkOperationId };
    }

    return this.dataSource.transaction(async (manager) => {
      const clientRepo = manager.getRepository(Client);

      // Get clients that belong to this company
      const clients = await clientRepo.find({
        where: {
          id: In(dto.clientIds),
          companyId,
          isActive: true,
        },
      });

      if (clients.length === 0) {
        return { affected: 0, requested: dto.clientIds.length, bulkOperationId };
      }

      // Collect old values for changelog before mutation
      const oldValuesMap = new Map<string, Record<string, unknown>>();
      for (const client of clients) {
        oldValuesMap.set(client.id, this.sanitizeClientForLog(client));
      }

      // Batch update all clients
      for (const client of clients) {
        applyUpdate(client, updatePayload, [
          'id',
          'companyId',
          'createdById',
          'createdAt',
          'updatedAt',
        ]);
        client.updatedById = user.id;
      }
      await clientRepo.save(clients);

      // Prepare changelog entries with old and new values
      // Note: Non-null assertion is safe - same invariant as above.
      const changelogEntries = clients.map((client) => ({
        entityId: client.id,
        oldData: {
          ...oldValuesMap.get(client.id)!,
          _bulkOperationId: bulkOperationId,
        },
        newData: {
          ...this.sanitizeClientForLog(client),
          _bulkOperationId: bulkOperationId,
        },
      }));

      // Batch log all updates in a single database call
      await this.changeLogService.logBulkUpdate('Client', changelogEntries, user);

      // Prepare updates for batch notification
      // Note: Non-null assertion is safe - same invariant as changelogEntries above.
      const notificationUpdates = clients.map((client) => ({
        client,
        oldValues: oldValuesMap.get(client.id)!,
      }));

      // Batch notify about all updated clients
      await this.clientChangelogService.notifyBulkClientsUpdated(notificationUpdates, user);

      this.logger.log(`Bulk edited ${clients.length} clients`, {
        companyId,
        userId: user.id,
        clientIds: clients.map((c) => c.id),
        changes: updatePayload,
        bulkOperationId,
      });

      return { affected: clients.length, requested: dto.clientIds.length, bulkOperationId };
    });
  }

  private sanitizeClientForLog(client: Client): Record<string, unknown> {
    return sanitizeForLog(client, [
      'name',
      'nip',
      'email',
      'phone',
      'companyStartDate',
      'cooperationStartDate',
      'companySpecificity',
      'additionalInfo',
      'gtuCode',
      'amlGroup',
      'gtuCodes',
      'pkdCode',
      'amlGroupEnum',
      'receiveEmailCopy',
      'employmentType',
      'vatStatus',
      'taxScheme',
      'zusStatus',
      'isActive',
    ]);
  }
}
