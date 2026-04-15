import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  ChangeLog,
  Client,
  PaginatedResponseDto,
  PaginationQueryDto,
  User,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';
import { ChangeLogService } from '@accounting/infrastructure/change-log';

import { ClientChangelogEmailService } from './client-changelog-email.service';

/**
 * Service for client changelog operations (read changelog + delegate email notifications).
 * Email notification logic is extracted to ClientChangelogEmailService for SRP.
 */
@Injectable()
export class ClientChangelogService {
  private readonly logger = new Logger(ClientChangelogService.name);

  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly changeLogService: ChangeLogService,
    private readonly emailService: ClientChangelogEmailService,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getClientChangelog(
    clientId: string,
    user: User
  ): Promise<{ logs: ChangeLog[]; total: number }> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new ForbiddenException(
        'Access denied: Client not found or belongs to a different company'
      );
    }

    return this.changeLogService.getChangeLogs('Client', clientId);
  }

  async getCompanyChangelog(
    user: User,
    pagination?: PaginationQueryDto
  ): Promise<PaginatedResponseDto<ChangeLog>> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const { page = 1, limit = 50 } = pagination || {};
    const skip = (page - 1) * limit;

    const { logs, total } = await this.changeLogService.getCompanyChangeLogs('Client', companyId, {
      limit,
      offset: skip,
    });

    return new PaginatedResponseDto(logs, total, page, limit);
  }

  // ==================== Email Notification Delegation ====================

  async notifyClientCreated(client: Client, performedBy: User): Promise<void> {
    return this.emailService.notifyClientCreated(client, performedBy);
  }

  async notifyClientUpdated(
    client: Client,
    oldValues: Record<string, unknown>,
    performedBy: User
  ): Promise<void> {
    return this.emailService.notifyClientUpdated(client, oldValues, performedBy);
  }

  async notifyClientDeleted(client: Client, performedBy: User): Promise<void> {
    return this.emailService.notifyClientDeleted(client, performedBy);
  }

  async notifyBulkClientsDeleted(clients: Client[], performedBy: User): Promise<void> {
    return this.emailService.notifyBulkClientsDeleted(clients, performedBy);
  }

  async notifyBulkClientsUpdated(
    updates: Array<{ client: Client; oldValues: Record<string, unknown> }>,
    performedBy: User
  ): Promise<void> {
    return this.emailService.notifyBulkClientsUpdated(updates, performedBy);
  }
}
