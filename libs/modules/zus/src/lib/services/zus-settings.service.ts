import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import {
  Client,
  HealthContributionType,
  User,
  ZusClientSettings,
  ZusDiscountType,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { UpdateZusSettingsDto, ZusSettingsResponseDto } from '../dto';
import { ZusSettingsNotFoundException } from '../exceptions';

/**
 * Service for managing ZUS client settings
 * Serwis zarządzający ustawieniami ZUS klientów
 */
@Injectable()
export class ZusSettingsService {
  private readonly logger = new Logger(ZusSettingsService.name);

  constructor(
    @InjectRepository(ZusClientSettings)
    private readonly zusSettingsRepository: Repository<ZusClientSettings>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Get ZUS settings for a client
   */
  async getClientSettings(clientId: string, user: User): Promise<ZusSettingsResponseDto | null> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const settings = await this.zusSettingsRepository.findOne({
      where: {
        clientId,
        companyId,
        isActive: true,
      },
    });

    if (!settings) {
      return null;
    }

    return ZusSettingsResponseDto.fromEntity(settings);
  }

  /**
   * Get ZUS settings entity for a client (internal use)
   */
  async getClientSettingsEntity(
    clientId: string,
    companyId: string
  ): Promise<ZusClientSettings | null> {
    return this.zusSettingsRepository.findOne({
      where: {
        clientId,
        companyId,
        isActive: true,
      },
    });
  }

  /**
   * Create or update ZUS settings for a client
   */
  async createOrUpdateSettings(
    clientId: string,
    dto: UpdateZusSettingsDto,
    user: User
  ): Promise<ZusSettingsResponseDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Verify client exists and belongs to company
    const client = await this.clientRepository.findOne({
      where: {
        id: clientId,
        companyId,
        isActive: true,
      },
    });

    if (!client) {
      throw new NotFoundException(`Klient o ID ${clientId} nie istnieje`);
    }

    // Find existing settings
    let settings = await this.zusSettingsRepository.findOne({
      where: {
        clientId,
        companyId,
      },
    });

    if (settings) {
      // Update existing settings
      Object.assign(settings, {
        ...dto,
        discountStartDate: dto.discountStartDate
          ? new Date(dto.discountStartDate)
          : settings.discountStartDate,
        discountEndDate: dto.discountEndDate
          ? new Date(dto.discountEndDate)
          : settings.discountEndDate,
        updatedById: user.id,
        isActive: true,
      });
    } else {
      // Create new settings
      settings = this.zusSettingsRepository.create({
        clientId,
        companyId,
        discountType: dto.discountType ?? ZusDiscountType.NONE,
        discountStartDate: dto.discountStartDate ? new Date(dto.discountStartDate) : undefined,
        discountEndDate: dto.discountEndDate ? new Date(dto.discountEndDate) : undefined,
        healthContributionType: dto.healthContributionType ?? HealthContributionType.SCALE,
        sicknessInsuranceOptIn: dto.sicknessInsuranceOptIn ?? false,
        paymentDay: dto.paymentDay ?? 15,
        accidentRate: dto.accidentRate ?? 0.0167,
        isActive: true,
        createdById: user.id,
      });
    }

    // Auto-calculate discount end date if not provided
    if (dto.discountType && dto.discountStartDate && !dto.discountEndDate) {
      const endDate = this.calculateDiscountEndDate(
        dto.discountType,
        new Date(dto.discountStartDate)
      );
      if (endDate) {
        settings.discountEndDate = endDate;
      }
    }

    const saved = await this.zusSettingsRepository.save(settings);

    this.logger.log(`ZUS settings ${settings.id ? 'updated' : 'created'} for client ${clientId}`);

    return ZusSettingsResponseDto.fromEntity(saved);
  }

  /**
   * Delete (deactivate) ZUS settings for a client
   */
  async deleteSettings(clientId: string, user: User): Promise<void> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    const settings = await this.zusSettingsRepository.findOne({
      where: {
        clientId,
        companyId,
        isActive: true,
      },
    });

    if (!settings) {
      throw new ZusSettingsNotFoundException(clientId);
    }

    settings.isActive = false;
    settings.updatedById = user.id;

    await this.zusSettingsRepository.save(settings);

    this.logger.log(`ZUS settings deactivated for client ${clientId}`);
  }

  /**
   * Get all clients with ZUS settings for a company
   */
  async getClientsWithSettings(user: User): Promise<ZusClientSettings[]> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);
    return this.zusSettingsRepository.find({
      where: {
        companyId,
        isActive: true,
      },
      relations: ['client'],
    });
  }

  /**
   * Check if a client's discount period is still valid
   */
  isDiscountValid(settings: ZusClientSettings): boolean {
    if (settings.discountType === ZusDiscountType.NONE) {
      return true; // No discount, always valid
    }

    if (!settings.discountEndDate) {
      return true; // No end date set
    }

    return new Date() <= settings.discountEndDate;
  }

  /**
   * Calculate discount end date based on discount type and start date
   */
  private calculateDiscountEndDate(discountType: ZusDiscountType, startDate: Date): Date | null {
    switch (discountType) {
      case ZusDiscountType.STARTUP_RELIEF:
        // 6 months
        return new Date(startDate.getFullYear(), startDate.getMonth() + 6, startDate.getDate());

      case ZusDiscountType.SMALL_ZUS:
        // 24 months
        return new Date(startDate.getFullYear(), startDate.getMonth() + 24, startDate.getDate());

      case ZusDiscountType.SMALL_ZUS_PLUS:
        // 36 months in 60-month window
        return new Date(startDate.getFullYear(), startDate.getMonth() + 36, startDate.getDate());

      default:
        return null;
    }
  }
}
