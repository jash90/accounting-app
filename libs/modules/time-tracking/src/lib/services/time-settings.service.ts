import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { TimeRoundingMethod, TimeSettings, User } from '@accounting/common';
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
    private readonly tenantService: TenantService
  ) {}

  /**
   * Get settings for the current company, creating default if not exists.
   * Results are cached for 5 minutes per company.
   *
   * Uses INSERT ... ON CONFLICT to handle race conditions when multiple
   * requests try to create settings simultaneously for the same company.
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
      // Use upsert pattern to handle race conditions.
      // If two requests arrive simultaneously for a company without settings,
      // ON CONFLICT ensures only one row is created and the other gets the existing row.
      const defaultSettings = {
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
      };

      try {
        // Try to insert with ON CONFLICT DO NOTHING to handle race conditions
        await this.settingsRepository
          .createQueryBuilder()
          .insert()
          .into(TimeSettings)
          .values(defaultSettings)
          .orIgnore() // ON CONFLICT DO NOTHING
          .execute();

        // Fetch the settings (either just created or already existing)
        settings = await this.settingsRepository.findOne({
          where: { companyId },
        });

        if (settings) {
          this.logger.log(`Ensured time settings exist for company ${companyId}`);
        }
      } catch (error) {
        // Fallback: If insert fails for any reason, try to fetch existing settings
        settings = await this.settingsRepository.findOne({
          where: { companyId },
        });

        if (!settings) {
          // If still no settings, rethrow the original error
          throw error;
        }
      }
    }

    // Ensure settings is not null - this should never happen after the upsert logic
    if (!settings) {
      throw new Error(
        `Failed to retrieve or create time settings for company ${companyId}. ` +
          `This may indicate a database connectivity issue or data corruption.`
      );
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
  async updateSettings(dto: UpdateTimeSettingsDto, user: User): Promise<TimeSettings> {
    const settings = await this.getSettings(user);
    const companyId = settings.companyId;

    // Create a new object with merged properties to avoid mutating cached entity
    const updatedSettings = this.settingsRepository.create({
      ...settings,
      ...dto,
      updatedById: user.id,
    });
    const savedSettings = await this.settingsRepository.save(updatedSettings);

    // Invalidate cache for this company
    this.cache.delete(companyId);

    this.logger.log(`Updated time settings for company ${companyId}`);

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
  async getRoundingConfig(user: User): Promise<{ method: TimeRoundingMethod; interval: number }> {
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
