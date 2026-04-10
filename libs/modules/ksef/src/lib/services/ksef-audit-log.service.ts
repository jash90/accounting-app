import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KsefAuditLog, PaginatedResponseDto } from '@accounting/common';
import { calculatePagination } from '@accounting/common/backend';

import { GetKsefAuditLogsQueryDto, KsefAuditLogResponseDto } from '../dto';

@Injectable()
export class KsefAuditLogService {
  constructor(
    @InjectRepository(KsefAuditLog)
    private readonly auditLogRepo: Repository<KsefAuditLog>,
  ) {}

  async log(params: {
    companyId: string;
    userId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    httpMethod?: string;
    httpUrl?: string;
    httpStatusCode?: number;
    responseSnippet?: string;
    errorMessage?: string;
    durationMs?: number;
  }): Promise<void> {
    const entry = this.auditLogRepo.create(params);
    await this.auditLogRepo.save(entry);
  }

  async findAll(
    companyId: string,
    query: GetKsefAuditLogsQueryDto,
  ): Promise<PaginatedResponseDto<KsefAuditLogResponseDto>> {
    const { page, limit, skip } = calculatePagination(query);

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where('log.companyId = :companyId', { companyId });

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', { entityType: query.entityType });
    }

    if (query.dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('log.createdAt <= :dateTo', { dateTo: query.dateTo });
    }

    const total = await qb.getCount();

    const data = await qb
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return new PaginatedResponseDto(data.map(this.toResponseDto), total, page, limit);
  }

  async findByEntity(entityType: string, entityId: string): Promise<KsefAuditLog[]> {
    return this.auditLogRepo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  private toResponseDto(log: KsefAuditLog): KsefAuditLogResponseDto {
    const dto = new KsefAuditLogResponseDto();
    dto.id = log.id;
    dto.companyId = log.companyId;
    dto.action = log.action;
    dto.entityType = log.entityType ?? null;
    dto.entityId = log.entityId ?? null;
    dto.httpMethod = log.httpMethod ?? null;
    dto.httpUrl = log.httpUrl ?? null;
    dto.httpStatusCode = log.httpStatusCode ?? null;
    dto.responseSnippet = log.responseSnippet ?? null;
    dto.errorMessage = log.errorMessage ?? null;
    dto.durationMs = log.durationMs ?? null;
    dto.userId = log.userId;
    dto.createdAt = log.createdAt.toISOString();

    if (log.user) {
      dto.user = {
        id: log.user.id,
        email: log.user.email,
        firstName: log.user.firstName ?? undefined,
        lastName: log.user.lastName ?? undefined,
      };
    }

    return dto;
  }
}
