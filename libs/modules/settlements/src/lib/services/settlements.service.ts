import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { In, Repository } from 'typeorm';

import {
  Client,
  MonthlySettlement,
  PaginatedResponseDto,
  SettlementStatus,
  User,
  UserRole,
  type SettlementStatusHistoryEntry,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import {
  AssignSettlementDto,
  BulkAssignDto,
  GetSettlementsQueryDto,
  InitializeMonthDto,
  UpdateSettlementDto,
  UpdateSettlementStatusDto,
} from '../dto';
import {
  SettlementAccessDeniedException,
  SettlementNotFoundException,
  UserNotFoundException,
} from '../exceptions';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    @InjectRepository(MonthlySettlement)
    private readonly settlementRepository: Repository<MonthlySettlement>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Check if user can view all clients (owner/admin) or only their own (employee)
   */
  private canViewAllClients(user: User): boolean {
    return [UserRole.COMPANY_OWNER, UserRole.ADMIN].includes(user.role);
  }

  /**
   * Escape special characters in LIKE patterns
   */
  private escapeLikePattern(pattern: string): string {
    return pattern.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  async findAll(
    query: GetSettlementsQueryDto,
    user: User
  ): Promise<PaginatedResponseDto<MonthlySettlement>> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.settlementRepository
      .createQueryBuilder('settlement')
      .leftJoinAndSelect('settlement.client', 'client')
      .leftJoinAndSelect('settlement.assignedUser', 'assignedUser')
      .leftJoinAndSelect('settlement.assignedBy', 'assignedBy')
      .leftJoinAndSelect('settlement.settledBy', 'settledBy')
      .where('settlement.companyId = :companyId', { companyId })
      .andWhere('settlement.month = :month', { month: query.month })
      .andWhere('settlement.year = :year', { year: query.year });

    // CRITICAL: Role-based filtering
    if (!this.canViewAllClients(user)) {
      // EMPLOYEE sees only their assigned settlements
      qb.andWhere('settlement.userId = :userId', { userId: user.id });
    } else if (query.unassigned) {
      qb.andWhere('settlement.userId IS NULL');
    } else if (query.assigneeId) {
      qb.andWhere('settlement.userId = :assigneeId', { assigneeId: query.assigneeId });
    }

    // Status filter
    if (query.status) {
      qb.andWhere('settlement.status = :status', { status: query.status });
    }

    // Tax scheme filter
    if (query.taxScheme) {
      qb.andWhere('client.taxScheme = :taxScheme', { taxScheme: query.taxScheme });
    }

    // Requires attention filter
    if (query.requiresAttention !== undefined) {
      qb.andWhere('settlement.requiresAttention = :requiresAttention', {
        requiresAttention: query.requiresAttention,
      });
    }

    // Search filter (client name or NIP)
    if (query.search) {
      const escapedSearch = this.escapeLikePattern(query.search);
      qb.andWhere(
        "(client.name ILIKE :search ESCAPE '\\' OR client.nip ILIKE :search ESCAPE '\\')",
        { search: `%${escapedSearch}%` }
      );
    }

    // Sorting
    const sortBy = query.sortBy ?? 'client.name';
    const sortOrder = (query.sortOrder?.toUpperCase() as 'ASC' | 'DESC') ?? 'ASC';
    qb.orderBy(sortBy, sortOrder);

    // Pagination
    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string, user: User): Promise<MonthlySettlement> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const settlement = await this.settlementRepository.findOne({
      where: { id, companyId },
      relations: ['client', 'assignedUser', 'assignedBy', 'settledBy'],
    });

    if (!settlement) {
      throw new SettlementNotFoundException(id, companyId);
    }

    // Check access for employees
    if (!this.canViewAllClients(user) && settlement.userId !== user.id) {
      throw new SettlementAccessDeniedException(id);
    }

    return settlement;
  }

  async initializeMonth(
    dto: InitializeMonthDto,
    user: User
  ): Promise<{ created: number; skipped: number }> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Get all active clients for the company
    const activeClients = await this.clientRepository.find({
      where: { companyId, isActive: true },
    });

    // Get existing settlements for this month/year
    const existingSettlements = await this.settlementRepository.find({
      where: { companyId, month: dto.month, year: dto.year },
      select: ['clientId'],
    });

    const existingClientIds = new Set(existingSettlements.map((s) => s.clientId));

    // Create settlements for clients without one
    const settlementsToCreate: Partial<MonthlySettlement>[] = [];

    for (const client of activeClients) {
      if (!existingClientIds.has(client.id)) {
        settlementsToCreate.push({
          clientId: client.id,
          month: dto.month,
          year: dto.year,
          status: SettlementStatus.PENDING,
          companyId,
          statusHistory: [
            {
              status: SettlementStatus.PENDING,
              changedAt: new Date().toISOString(),
              changedById: user.id,
              changedByEmail: user.email,
              notes: 'Automatyczne utworzenie rozliczenia',
            },
          ],
        });
      }
    }

    if (settlementsToCreate.length > 0) {
      await this.settlementRepository.save(settlementsToCreate);
    }

    this.logger.log(
      `Initialized month ${dto.month}/${dto.year} for company ${companyId}: ` +
        `${settlementsToCreate.length} created, ${existingClientIds.size} skipped`
    );

    return {
      created: settlementsToCreate.length,
      skipped: existingClientIds.size,
    };
  }

  async updateStatus(
    id: string,
    dto: UpdateSettlementStatusDto,
    user: User
  ): Promise<MonthlySettlement> {
    const settlement = await this.findOne(id, user);

    // Check if employee can update (only their own settlements)
    if (!this.canViewAllClients(user) && settlement.userId !== user.id) {
      throw new SettlementAccessDeniedException(id);
    }

    const oldStatus = settlement.status;
    settlement.status = dto.status;

    // Add to status history
    const historyEntry: SettlementStatusHistoryEntry = {
      status: dto.status,
      changedAt: new Date().toISOString(),
      changedById: user.id,
      changedByEmail: user.email,
      notes: dto.notes,
    };

    settlement.statusHistory = [...(settlement.statusHistory || []), historyEntry];

    // If completed, set settled info
    if (dto.status === SettlementStatus.COMPLETED && oldStatus !== SettlementStatus.COMPLETED) {
      settlement.settledAt = new Date();
      settlement.settledById = user.id;
    } else if (dto.status !== SettlementStatus.COMPLETED) {
      settlement.settledAt = null;
      settlement.settledById = null;
    }

    const saved = await this.settlementRepository.save(settlement);

    this.logger.log(
      `Status updated for settlement ${id}: ${oldStatus} -> ${dto.status} by user ${user.id}`
    );

    return saved;
  }

  async update(id: string, dto: UpdateSettlementDto, user: User): Promise<MonthlySettlement> {
    const settlement = await this.findOne(id, user);

    // Check if employee can update (only their own settlements)
    if (!this.canViewAllClients(user) && settlement.userId !== user.id) {
      throw new SettlementAccessDeniedException(id);
    }

    // Update fields
    if (dto.status !== undefined) {
      const historyEntry: SettlementStatusHistoryEntry = {
        status: dto.status,
        changedAt: new Date().toISOString(),
        changedById: user.id,
        changedByEmail: user.email,
      };
      settlement.statusHistory = [...(settlement.statusHistory || []), historyEntry];
      settlement.status = dto.status;

      if (dto.status === SettlementStatus.COMPLETED) {
        settlement.settledAt = new Date();
        settlement.settledById = user.id;
      }
    }

    if (dto.notes !== undefined) settlement.notes = dto.notes;
    if (dto.invoiceCount !== undefined) settlement.invoiceCount = dto.invoiceCount;
    if (dto.documentsDate !== undefined) {
      settlement.documentsDate = dto.documentsDate ? new Date(dto.documentsDate) : null;
    }
    if (dto.priority !== undefined) settlement.priority = dto.priority;
    if (dto.deadline !== undefined) {
      settlement.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }
    if (dto.documentsComplete !== undefined) settlement.documentsComplete = dto.documentsComplete;
    if (dto.requiresAttention !== undefined) settlement.requiresAttention = dto.requiresAttention;
    if (dto.attentionReason !== undefined) settlement.attentionReason = dto.attentionReason;

    return this.settlementRepository.save(settlement);
  }

  async assignToEmployee(
    id: string,
    dto: AssignSettlementDto,
    user: User
  ): Promise<MonthlySettlement> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const settlement = await this.settlementRepository.findOne({
      where: { id, companyId },
      relations: ['client', 'assignedUser'],
    });

    if (!settlement) {
      throw new SettlementNotFoundException(id, companyId);
    }

    // Validate assignee exists and belongs to company (if not null)
    if (dto.userId) {
      const assignee = await this.userRepository.findOne({
        where: { id: dto.userId, companyId },
      });

      if (!assignee) {
        throw new UserNotFoundException(dto.userId, companyId);
      }
    }

    settlement.userId = dto.userId ?? null;
    settlement.assignedById = user.id;

    const saved = await this.settlementRepository.save(settlement);

    this.logger.log(`Settlement ${id} assigned to user ${dto.userId ?? 'none'} by ${user.id}`);

    // Reload with relations
    return this.findOne(saved.id, user);
  }

  async bulkAssign(
    dto: BulkAssignDto,
    user: User
  ): Promise<{ assigned: number; requested: number }> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Validate assignee
    const assignee = await this.userRepository.findOne({
      where: { id: dto.userId, companyId },
    });

    if (!assignee) {
      throw new UserNotFoundException(dto.userId, companyId);
    }

    // Get settlements that belong to this company
    const settlements = await this.settlementRepository.find({
      where: { id: In(dto.settlementIds), companyId },
    });

    if (settlements.length === 0) {
      return { assigned: 0, requested: dto.settlementIds.length };
    }

    // Update all settlements
    for (const settlement of settlements) {
      settlement.userId = dto.userId;
      settlement.assignedById = user.id;
    }

    await this.settlementRepository.save(settlements);

    this.logger.log(
      `Bulk assigned ${settlements.length} settlements to user ${dto.userId} by ${user.id}`
    );

    return { assigned: settlements.length, requested: dto.settlementIds.length };
  }
}
