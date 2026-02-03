import { TenantService } from '@accounting/common/backend';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addMonths } from 'date-fns';
import { Between, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import {
  Client,
  ClientReliefPeriod,
  ReliefType,
  ReliefTypeDurationMonths,
  User,
  UserRole,
} from '@accounting/common';
import {
  CreateReliefPeriodDto,
  getReliefTypeLabel,
  ReliefPeriodResponseDto,
  UpdateReliefPeriodDto,
} from '../dto/relief-period.dto';
import { ClientNotFoundException } from '../exceptions';

@Injectable()
export class ReliefPeriodService {
  private readonly logger = new Logger(ReliefPeriodService.name);

  constructor(
    @InjectRepository(ClientReliefPeriod)
    private readonly reliefRepository: Repository<ClientReliefPeriod>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Calculate end date based on relief type duration.
   */
  calculateEndDate(startDate: Date, reliefType: ReliefType): Date {
    const months = ReliefTypeDurationMonths[reliefType];
    return addMonths(startDate, months);
  }

  /**
   * Create a new relief period for a client.
   */
  async create(
    clientId: string,
    dto: CreateReliefPeriodDto,
    user: User
  ): Promise<ReliefPeriodResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists and belongs to company
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId, isActive: true },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate
      ? new Date(dto.endDate)
      : this.calculateEndDate(startDate, dto.reliefType);

    // Validate endDate is after startDate
    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('Data zakończenia musi być późniejsza niż data rozpoczęcia');
    }

    // Check if client already has a relief of the same type with overlapping dates
    // Overlap check: existing.startDate <= new.endDate AND existing.endDate >= new.startDate
    const overlappingRelief = await this.reliefRepository.findOne({
      where: {
        clientId,
        companyId,
        reliefType: dto.reliefType,
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });

    if (overlappingRelief) {
      throw new BadRequestException(
        `Klient już posiada ulgę typu "${getReliefTypeLabel(dto.reliefType)}" w nakładającym się okresie`
      );
    }

    const relief = this.reliefRepository.create({
      clientId,
      companyId,
      reliefType: dto.reliefType,
      startDate,
      endDate,
      isActive: true,
      createdById: user.id,
    });

    const saved = await this.reliefRepository.save(relief);

    this.logger.log('Client relief period created', {
      reliefId: saved.id,
      clientId,
      companyId,
      reliefType: dto.reliefType,
      startDate: dto.startDate,
      endDate: saved.endDate,
      userId: user.id,
    });

    return this.mapToResponseDto(saved, client);
  }

  /**
   * Update an existing relief period.
   */
  async update(
    clientId: string,
    reliefId: string,
    dto: UpdateReliefPeriodDto,
    user: User
  ): Promise<ReliefPeriodResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const relief = await this.reliefRepository.findOne({
      where: { id: reliefId, clientId, companyId },
      relations: ['client'],
    });

    if (!relief) {
      throw new NotFoundException(
        `Ulga o ID ${reliefId} nie została znaleziona dla klienta ${clientId}`
      );
    }

    // Update start date if provided
    if (dto.startDate !== undefined) {
      relief.startDate = new Date(dto.startDate);
    }

    // Update end date if provided
    if (dto.endDate !== undefined) {
      const newEndDate = new Date(dto.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Validate that endDate is not in the past
      if (newEndDate < today) {
        throw new BadRequestException('Data zakończenia nie może być w przeszłości');
      }

      relief.endDate = newEndDate;
      // Reset notification flags if endDate changed
      relief.endDate7DayReminderSent = false;
      relief.endDate1DayReminderSent = false;
    }

    // Validate dates
    const startDate =
      relief.startDate instanceof Date ? relief.startDate : new Date(relief.startDate);
    const endDate = relief.endDate instanceof Date ? relief.endDate : new Date(relief.endDate);

    if (endDate.getTime() <= startDate.getTime()) {
      throw new BadRequestException('Data zakończenia musi być późniejsza niż data rozpoczęcia');
    }

    // Update isActive if provided
    if (dto.isActive !== undefined) {
      relief.isActive = dto.isActive;
    }

    const saved = await this.reliefRepository.save(relief);

    this.logger.log('Client relief period updated', {
      reliefId: saved.id,
      clientId,
      companyId,
      userId: user.id,
    });

    return this.mapToResponseDto(saved, relief.client);
  }

  /**
   * Delete a relief period.
   */
  async remove(clientId: string, reliefId: string, user: User): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const relief = await this.reliefRepository.findOne({
      where: { id: reliefId, clientId, companyId },
    });

    if (!relief) {
      throw new NotFoundException(
        `Ulga o ID ${reliefId} nie została znaleziona dla klienta ${clientId}`
      );
    }

    await this.reliefRepository.remove(relief);

    this.logger.log('Client relief period deleted', {
      reliefId,
      clientId,
      companyId,
      userId: user.id,
    });
  }

  /**
   * Get all relief periods for a client.
   */
  async findAll(clientId: string, user: User): Promise<ReliefPeriodResponseDto[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists, belongs to company, and is active
    const client = await this.clientRepository.findOne({
      where: { id: clientId, companyId, isActive: true },
    });

    if (!client) {
      throw new ClientNotFoundException(clientId, companyId);
    }

    const reliefs = await this.reliefRepository.find({
      where: { clientId, companyId },
      relations: ['createdBy'],
      order: { startDate: 'DESC' },
    });

    return reliefs.map((r) => this.mapToResponseDto(r, client));
  }

  /**
   * Get a specific relief period.
   */
  async findOne(clientId: string, reliefId: string, user: User): Promise<ReliefPeriodResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const relief = await this.reliefRepository.findOne({
      where: { id: reliefId, clientId, companyId },
      relations: ['client', 'createdBy'],
    });

    if (!relief) {
      throw new NotFoundException(
        `Ulga o ID ${reliefId} nie została znaleziona dla klienta ${clientId}`
      );
    }

    return this.mapToResponseDto(relief, relief.client);
  }

  /**
   * Get active relief periods for a client by type.
   * Validates both isActive flag AND actual date range.
   */
  async getActiveReliefByType(
    clientId: string,
    companyId: string,
    reliefType: ReliefType
  ): Promise<ClientReliefPeriod | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.reliefRepository.findOne({
      where: {
        clientId,
        companyId,
        reliefType,
        isActive: true,
        startDate: LessThanOrEqual(today),
        endDate: MoreThan(today),
      },
    });
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
   * Get relief periods that need 7-day end reminder.
   */
  async getReliefsFor7DayEndReminder(): Promise<ClientReliefPeriod[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.reliefRepository.find({
      where: {
        endDate: Between(startOfDay, endOfDay),
        endDate7DayReminderSent: false,
        isActive: true,
      },
      relations: ['client'],
    });
  }

  /**
   * Get relief periods that need 1-day end reminder.
   */
  async getReliefsFor1DayEndReminder(): Promise<ClientReliefPeriod[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 1);
    targetDate.setHours(0, 0, 0, 0);
    const startOfDay = new Date(targetDate);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return this.reliefRepository.find({
      where: {
        endDate: Between(startOfDay, endOfDay),
        endDate1DayReminderSent: false,
        isActive: true,
      },
      relations: ['client'],
    });
  }

  /**
   * Mark reminder as sent.
   */
  async markReminderSent(
    reliefId: string,
    reminderType: 'endDate7DayReminderSent' | 'endDate1DayReminderSent'
  ): Promise<void> {
    await this.reliefRepository.update(reliefId, {
      [reminderType]: true,
    });
  }

  /**
   * Map entity to response DTO.
   */
  private mapToResponseDto(relief: ClientReliefPeriod, client: Client): ReliefPeriodResponseDto {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDateNormalized = new Date(relief.endDate);
    endDateNormalized.setHours(0, 0, 0, 0);

    // Calculate days until end
    let daysUntilEnd: number | null = null;
    if (relief.isActive && endDateNormalized.getTime() >= today.getTime()) {
      const diffTime = endDateNormalized.getTime() - today.getTime();
      daysUntilEnd = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      id: relief.id,
      clientId: relief.clientId,
      clientName: client.name,
      companyId: relief.companyId,
      reliefType: relief.reliefType,
      reliefTypeLabel: getReliefTypeLabel(relief.reliefType),
      startDate: relief.startDate,
      endDate: relief.endDate,
      daysUntilEnd,
      isActive: relief.isActive,
      createdById: relief.createdById,
      createdByName: relief.createdBy
        ? `${relief.createdBy.firstName} ${relief.createdBy.lastName}`
        : undefined,
      createdAt: relief.createdAt,
      updatedAt: relief.updatedAt,
    };
  }
}
