import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TimeSettings,
  TimeRoundingMethod,
  User,
  TenantService,
} from '@accounting/common';
import { UpdateTimeSettingsDto } from '../dto/time-settings.dto';

@Injectable()
export class TimeSettingsService {
  private readonly logger = new Logger(TimeSettingsService.name);

  constructor(
    @InjectRepository(TimeSettings)
    private readonly settingsRepository: Repository<TimeSettings>,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Get settings for the current company, creating default if not exists
   */
  async getSettings(user: User): Promise<TimeSettings> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    let settings = await this.settingsRepository.findOne({
      where: { companyId },
    });

    if (!settings) {
      // Create default settings
      settings = this.settingsRepository.create({
        companyId,
        roundingMethod: TimeRoundingMethod.NONE,
        roundingIntervalMinutes: 15,
        defaultCurrency: 'PLN',
        requireApproval: false,
        allowOverlappingEntries: true,
        workingHoursPerDay: 8,
        workingHoursPerWeek: 40,
        weekStartDay: 1, // Monday
        allowTimerMode: true,
        allowManualEntry: true,
        autoStopTimerAfterMinutes: 0,
        minimumEntryMinutes: 0,
        maximumEntryMinutes: 0,
        enableDailyReminder: false,
        lockEntriesAfterDays: 0,
      });
      settings = await this.settingsRepository.save(settings);
      this.logger.log(`Created default time settings for company ${companyId}`);
    }

    return settings;
  }

  /**
   * Update settings for the current company
   */
  async updateSettings(
    dto: UpdateTimeSettingsDto,
    user: User,
  ): Promise<TimeSettings> {
    const settings = await this.getSettings(user);

    Object.assign(settings, dto, { updatedById: user.id });
    const savedSettings = await this.settingsRepository.save(settings);

    this.logger.log(`Updated time settings for company ${settings.companyId}`);

    return savedSettings;
  }

  /**
   * Check if time entries require approval
   */
  async requiresApproval(user: User): Promise<boolean> {
    const settings = await this.getSettings(user);
    return settings.requireApproval;
  }

  /**
   * Check if overlapping entries are allowed
   */
  async allowsOverlapping(user: User): Promise<boolean> {
    const settings = await this.getSettings(user);
    return settings.allowOverlappingEntries;
  }

  /**
   * Get rounding configuration
   */
  async getRoundingConfig(
    user: User,
  ): Promise<{ method: TimeRoundingMethod; interval: number }> {
    const settings = await this.getSettings(user);
    return {
      method: settings.roundingMethod,
      interval: settings.roundingIntervalMinutes,
    };
  }
}
