import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TimeSettings,
  TimeRoundingMethod,
  User,
} from '@accounting/common';
import { TenantService } from '@accounting/common/backend';
import { UpdateTimeSettingsDto } from '../dto/time-settings.dto';

interface CacheEntry {
  settings: TimeSettings;
  expiresAt: number;
}

@Injectable()
export class TimeSettingsService {
  private readonly logger = new Logger(TimeSettingsService.name);

  /**
   * In-memory cache with TTL (5 minutes).
   *
   * WARNING: This cache is local to each application instance.
   * In multi-instance deployments (e.g., Kubernetes, load-balanced environments),
   * each instance maintains its own cache. This means:
   * - Cache invalidation on one instance won't affect others
   * - Settings updates may take up to TTL to propagate across instances
   *
   * For production with multiple instances, consider using Redis or another
   * distributed caching solution.
   */
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(TimeSettings)
    private readonly settingsRepository: Repository<TimeSettings>,
    private readonly tenantService: TenantService,
  ) {}

  /**
   * Get settings for the current company, creating default if not exists.
   * Results are cached for 5 minutes per company.
   */
  async getSettings(user: User): Promise<TimeSettings> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    // Check cache first
    const cached = this.cache.get(companyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.settings;
    }

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

    // Store in cache
    this.cache.set(companyId, {
      settings,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return settings;
  }

  /**
   * Update settings for the current company.
   * Invalidates the cache for this company.
   */
  async updateSettings(
    dto: UpdateTimeSettingsDto,
    user: User,
  ): Promise<TimeSettings> {
    const settings = await this.getSettings(user);

    Object.assign(settings, dto, { updatedById: user.id });
    const savedSettings = await this.settingsRepository.save(settings);

    // Invalidate cache for this company
    this.cache.delete(settings.companyId);

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

  /**
   * Clear the entire cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}
