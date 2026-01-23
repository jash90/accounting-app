import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import {
  Between,
  DataSource,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
  type EntityManager,
} from 'typeorm';

import { Client, ClientSuspension, User, UserRole } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import {
  CreateSuspensionDto,
  SuspensionResponseDto,
  UpdateSuspensionDto,
} from '../dto/suspension.dto';
import { ClientNotFoundException } from '../exceptions';

/** Far future date used for unbounded suspensions in overlap calculations */
const UNBOUNDED_END_DATE = '9999-12-31';

@Injectable()
export class SuspensionService {
  private readonly logger = new Logger(SuspensionService.name);

  constructor(
    @InjectRepository(ClientSuspension)
    private readonly suspensionRepository: Repository<ClientSuspension>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantService: TenantService,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Create a new suspension for a client.
   * Uses transaction to prevent race conditions between validation and save.
   */
  async create(
    clientId: string,
    dto: CreateSuspensionDto,
    user: User
  ): Promise<SuspensionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists and belongs to company
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId, isActive: true },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    // Validate endDate is after startDate
    if (endDate && endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('Data odwieszenia musi być późniejsza niż data zawieszenia');
    }

    // Use transaction to prevent race conditions between validation and save
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check for overlapping suspensions within transaction
      await this.validateNoOverlapWithManager(
        queryRunner.manager,
        clientId,
        companyId,
        startDate,
        endDate
      );

      const suspension = queryRunner.manager.create(ClientSuspension, {
        clientId,
        companyId,
        startDate,
        endDate,
        reason: dto.reason,
        createdById: user.id,
      });

      const saved = await queryRunner.manager.save(suspension);
      await queryRunner.commitTransaction();

      this.logger.log('Client suspension created', {
        suspensionId: saved.id,
        clientId,
        companyId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        userId: user.id,
      });

      return this.mapToResponseDto(saved, client);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update an existing suspension.
   * Uses transaction to prevent race conditions between validation and save.
   */
  async update(
    clientId: string,
    suspensionId: string,
    dto: UpdateSuspensionDto,
    user: User
  ): Promise<SuspensionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Use transaction to prevent race conditions between validation and save
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const suspension = await queryRunner.manager.findOne(ClientSuspension, {
        where: { id: suspensionId, clientId, companyId },
        relations: ['client'],
      });

      if (!suspension) {
        throw new NotFoundException(
          `Zawieszenie o ID ${suspensionId} nie zostało znalezione dla klienta ${clientId}`
        );
      }

      // Ensure startDate is a Date object (TypeORM may return string from query)
      const startDateObj =
        suspension.startDate instanceof Date
          ? suspension.startDate
          : new Date(suspension.startDate);

      const endDate = dto.endDate ? new Date(dto.endDate) : suspension.endDate;
      const endDateObj = endDate instanceof Date ? endDate : endDate ? new Date(endDate) : null;

      // Validate endDate is after startDate
      if (endDateObj && endDateObj.getTime() <= startDateObj.getTime()) {
        throw new BadRequestException('Data odwieszenia musi być późniejsza niż data zawieszenia');
      }

      // Check for overlapping suspensions (excluding current one) within transaction
      if (dto.endDate !== undefined) {
        await this.validateNoOverlapWithManager(
          queryRunner.manager,
          clientId,
          companyId,
          startDateObj,
          endDateObj ?? undefined,
          suspensionId
        );
      }

      if (dto.endDate !== undefined) {
        suspension.endDate = dto.endDate ? new Date(dto.endDate) : undefined;
        // Reset notification flags if endDate changed
        suspension.endDate7DayReminderSent = false;
        suspension.endDate1DayReminderSent = false;
        suspension.resumptionNotificationSent = false;
      }

      if (dto.reason !== undefined) {
        suspension.reason = dto.reason;
      }

      const saved = await queryRunner.manager.save(suspension);
      await queryRunner.commitTransaction();

      this.logger.log('Client suspension updated', {
        suspensionId: saved.id,
        clientId,
        companyId,
        endDate: dto.endDate,
        userId: user.id,
      });

      return this.mapToResponseDto(saved, suspension.client);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete a suspension.
   */
  async remove(clientId: string, suspensionId: string, user: User): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const suspension = await this.suspensionRepository.findOne({
      where: { id: suspensionId, clientId, companyId },
    });

    if (!suspension) {
      throw new NotFoundException(
        `Zawieszenie o ID ${suspensionId} nie zostało znalezione dla klienta ${clientId}`
      );
    }

    await this.suspensionRepository.remove(suspension);

    this.logger.log('Client suspension deleted', {
      suspensionId,
      clientId,
      companyId,
      userId: user.id,
    });
  }

  /**
   * Get all suspensions for a client.
   */
  async findAll(clientId: string, user: User): Promise<SuspensionResponseDto[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists, belongs to company, and is active
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId, isActive: true },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    const suspensions = await this.suspensionRepository.find({
      where: { clientId, companyId },
      relations: ['createdBy'],
      order: { startDate: 'DESC' },
    });

    return suspensions.map((s) => this.mapToResponseDto(s, client));
  }

  /**
   * Get a specific suspension.
   */
  async findOne(
    clientId: string,
    suspensionId: string,
    user: User
  ): Promise<SuspensionResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const suspension = await this.suspensionRepository.findOne({
      where: { id: suspensionId, clientId, companyId },
      relations: ['client', 'createdBy'],
    });

    if (!suspension) {
      throw new NotFoundException(
        `Zawieszenie o ID ${suspensionId} nie zostało znalezione dla klienta ${clientId}`
      );
    }

    return this.mapToResponseDto(suspension, suspension.client);
  }

  /**
   * Get current active suspension for a client.
   * A suspension is active if today is between startDate and endDate (or endDate is null).
   */
  async getCurrentSuspension(
    clientId: string,
    companyId: string
  ): Promise<ClientSuspension | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.suspensionRepository.findOne({
      where: [
        // Active suspension: startDate <= today AND (endDate is null OR endDate > today)
        {
          clientId,
          companyId,
          startDate: LessThanOrEqual(today),
          endDate: IsNull(),
        },
        {
          clientId,
          companyId,
          startDate: LessThanOrEqual(today),
          endDate: MoreThanOrEqual(today),
        },
      ],
      order: { startDate: 'DESC' },
    });
  }

  /**
   * Check if client is currently suspended.
   */
  async isClientSuspended(clientId: string, companyId: string): Promise<boolean> {
    const suspension = await this.getCurrentSuspension(clientId, companyId);
    return suspension !== null;
  }

  /**
   * Get employees for a company (for notifications).
   */
  async getCompanyEmployees(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        companyId,
        isActive: true,
        role: Not(UserRole.ADMIN),
      },
    });
  }

  /**
   * Get company owner(s) for notifications.
   */
  async getCompanyOwners(companyId: string): Promise<User[]> {
    return this.userRepository.find({
      where: {
        companyId,
        isActive: true,
        role: UserRole.COMPANY_OWNER,
      },
    });
  }

  /**
   * Get suspensions that need 7-day start reminder.
   */
  async getSuspensionsFor7DayStartReminder(): Promise<ClientSuspension[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.suspensionRepository.find({
      where: {
        startDate: Between(startOfDay, endOfDay),
        startDate7DayReminderSent: false,
      },
      relations: ['client'],
    });
  }

  /**
   * Get suspensions that need 1-day start reminder.
   */
  async getSuspensionsFor1DayStartReminder(): Promise<ClientSuspension[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.suspensionRepository.find({
      where: {
        startDate: Between(startOfDay, endOfDay),
        startDate1DayReminderSent: false,
      },
      relations: ['client'],
    });
  }

  /**
   * Get suspensions that need 7-day end reminder.
   */
  async getSuspensionsFor7DayEndReminder(): Promise<ClientSuspension[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.suspensionRepository.find({
      where: {
        endDate: Between(startOfDay, endOfDay),
        endDate7DayReminderSent: false,
      },
      relations: ['client'],
    });
  }

  /**
   * Get suspensions that need 1-day end reminder.
   */
  async getSuspensionsFor1DayEndReminder(): Promise<ClientSuspension[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.suspensionRepository.find({
      where: {
        endDate: Between(startOfDay, endOfDay),
        endDate1DayReminderSent: false,
      },
      relations: ['client'],
    });
  }

  /**
   * Get suspensions where resumption is today or past and notification not sent.
   */
  async getSuspensionsForResumptionNotification(): Promise<ClientSuspension[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.suspensionRepository.find({
      where: {
        endDate: LessThanOrEqual(today),
        resumptionNotificationSent: false,
      },
      relations: ['client'],
    });
  }

  /**
   * Mark reminder as sent.
   */
  async markReminderSent(
    suspensionId: string,
    reminderType:
      | 'startDate7DayReminderSent'
      | 'startDate1DayReminderSent'
      | 'endDate7DayReminderSent'
      | 'endDate1DayReminderSent'
      | 'resumptionNotificationSent'
  ): Promise<void> {
    await this.suspensionRepository.update(suspensionId, {
      [reminderType]: true,
    });
  }

  /**
   * Validate that the new suspension doesn't overlap with existing ones.
   * @deprecated Use validateNoOverlapWithManager instead for transaction safety.
   * Kept for potential non-transactional use cases.
   */
  private async validateNoOverlap(
    clientId: string,
    companyId: string,
    startDate: Date,
    endDate?: Date,
    excludeId?: string
  ): Promise<void> {
    const queryBuilder = this.suspensionRepository
      .createQueryBuilder('suspension')
      .where('suspension.clientId = :clientId', { clientId })
      .andWhere('suspension.companyId = :companyId', { companyId });

    if (excludeId) {
      queryBuilder.andWhere('suspension.id != :excludeId', { excludeId });
    }

    const existingSuspensions = await queryBuilder.getMany();
    this.checkOverlap(existingSuspensions, startDate, endDate);
  }

  /**
   * Validate overlap within a transaction using EntityManager.
   */
  private async validateNoOverlapWithManager(
    manager: EntityManager,
    clientId: string,
    companyId: string,
    startDate: Date,
    endDate?: Date,
    excludeId?: string
  ): Promise<void> {
    const queryBuilder = manager
      .createQueryBuilder(ClientSuspension, 'suspension')
      .where('suspension.clientId = :clientId', { clientId })
      .andWhere('suspension.companyId = :companyId', { companyId });

    if (excludeId) {
      queryBuilder.andWhere('suspension.id != :excludeId', { excludeId });
    }

    const existingSuspensions = await queryBuilder.getMany();
    this.checkOverlap(existingSuspensions, startDate, endDate);
  }

  /**
   * Check if the new period overlaps with any existing suspensions.
   */
  private checkOverlap(
    existingSuspensions: ClientSuspension[],
    startDate: Date,
    endDate?: Date
  ): void {
    for (const existing of existingSuspensions) {
      const existingEnd = existing.endDate || new Date(UNBOUNDED_END_DATE);
      const newEnd = endDate || new Date(UNBOUNDED_END_DATE);

      // Check if periods overlap using getTime() for reliable comparison
      if (
        startDate.getTime() < existingEnd.getTime() &&
        newEnd.getTime() > existing.startDate.getTime()
      ) {
        throw new BadRequestException(
          `Zawieszenie nakłada się z istniejącym okresem zawieszenia (${existing.startDate.toISOString().split('T')[0]} - ${existing.endDate?.toISOString().split('T')[0] || 'bez końca'})`
        );
      }
    }
  }

  /**
   * Map entity to response DTO.
   */
  private mapToResponseDto(suspension: ClientSuspension, client: Client): SuspensionResponseDto {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Normalize suspension dates for reliable comparison
    const startDateNormalized = new Date(suspension.startDate);
    startDateNormalized.setHours(0, 0, 0, 0);

    let endDateNormalized: Date | null = null;
    if (suspension.endDate) {
      endDateNormalized = new Date(suspension.endDate);
      endDateNormalized.setHours(0, 0, 0, 0);
    }

    const isActive =
      startDateNormalized.getTime() <= today.getTime() &&
      (endDateNormalized === null || endDateNormalized.getTime() >= today.getTime());

    return {
      id: suspension.id,
      clientId: suspension.clientId,
      clientName: client.name,
      companyId: suspension.companyId,
      startDate: suspension.startDate,
      endDate: suspension.endDate,
      reason: suspension.reason,
      createdById: suspension.createdById,
      createdByName: suspension.createdBy
        ? `${suspension.createdBy.firstName} ${suspension.createdBy.lastName}`
        : undefined,
      isActive,
      createdAt: suspension.createdAt,
      updatedAt: suspension.updatedAt,
    };
  }
}
