import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { SettlementSettings, User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import {
  SettlementSettingsResponseDto,
  UpdateSettlementSettingsDto,
} from '../dto/settlement-settings.dto';

@Injectable()
export class SettlementSettingsService {
  constructor(
    @InjectRepository(SettlementSettings)
    private readonly settingsRepository: Repository<SettlementSettings>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getSettings(user: User): Promise<SettlementSettingsResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Upsert pattern: find or create default settings
    let settings = await this.settingsRepository.findOne({ where: { companyId } });

    if (!settings) {
      settings = this.settingsRepository.create({
        companyId,
        defaultPriority: 0,
        defaultDeadlineDay: null,
        autoAssignEnabled: false,
        autoAssignRules: null,
        notifyOnStatusChange: true,
        notifyOnDeadlineApproaching: true,
        deadlineWarningDays: 3,
      });
      settings = await this.settingsRepository.save(settings);
    }

    return this.toResponseDto(settings);
  }

  async updateSettings(
    dto: UpdateSettlementSettingsDto,
    user: User
  ): Promise<SettlementSettingsResponseDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Find existing or create new
    let settings = await this.settingsRepository.findOne({ where: { companyId } });

    if (!settings) {
      settings = this.settingsRepository.create({ companyId });
    }

    // Apply updates
    if (dto.defaultPriority !== undefined) settings.defaultPriority = dto.defaultPriority;
    if (dto.defaultDeadlineDay !== undefined) settings.defaultDeadlineDay = dto.defaultDeadlineDay;
    if (dto.autoAssignEnabled !== undefined) settings.autoAssignEnabled = dto.autoAssignEnabled;
    if (dto.autoAssignRules !== undefined) settings.autoAssignRules = dto.autoAssignRules;
    if (dto.notifyOnStatusChange !== undefined)
      settings.notifyOnStatusChange = dto.notifyOnStatusChange;
    if (dto.notifyOnDeadlineApproaching !== undefined)
      settings.notifyOnDeadlineApproaching = dto.notifyOnDeadlineApproaching;
    if (dto.deadlineWarningDays !== undefined)
      settings.deadlineWarningDays = dto.deadlineWarningDays;

    settings = await this.settingsRepository.save(settings);
    return this.toResponseDto(settings);
  }

  private toResponseDto(settings: SettlementSettings): SettlementSettingsResponseDto {
    return {
      id: settings.id,
      companyId: settings.companyId,
      defaultPriority: settings.defaultPriority,
      defaultDeadlineDay: settings.defaultDeadlineDay ?? null,
      autoAssignEnabled: settings.autoAssignEnabled,
      autoAssignRules: settings.autoAssignRules ?? null,
      notifyOnStatusChange: settings.notifyOnStatusChange,
      notifyOnDeadlineApproaching: settings.notifyOnDeadlineApproaching,
      deadlineWarningDays: settings.deadlineWarningDays,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
