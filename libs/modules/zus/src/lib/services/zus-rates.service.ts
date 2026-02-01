import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';

import { DEFAULT_ZUS_RATES_2025, ZusRate, ZusRateType } from '@accounting/common';

/**
 * Service for managing ZUS rates and contribution bases
 * Serwis zarządzający stawkami i podstawami składek ZUS
 */
@Injectable()
export class ZusRatesService {
  private readonly logger = new Logger(ZusRatesService.name);

  // In-memory cache for rates (refreshed periodically)
  private ratesCache: Map<ZusRateType, number> = new Map();
  private lastCacheRefresh: Date | null = null;
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

  constructor(
    @InjectRepository(ZusRate)
    private readonly zusRateRepository: Repository<ZusRate>
  ) {}

  /**
   * Get current rate value for a specific rate type
   */
  async getCurrentRate(rateType: ZusRateType): Promise<number> {
    await this.ensureCacheIsValid();

    const cachedValue = this.ratesCache.get(rateType);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    // Fallback to DB query
    const rate = await this.getRateForDate(rateType, new Date());
    return rate?.value ?? this.getDefaultRate(rateType);
  }

  /**
   * Get rate value for a specific date
   */
  async getRateForDate(rateType: ZusRateType, date: Date): Promise<ZusRate | null> {
    const rate = await this.zusRateRepository.findOne({
      where: [
        {
          rateType,
          validFrom: LessThanOrEqual(date),
          validTo: MoreThanOrEqual(date),
        },
        {
          rateType,
          validFrom: LessThanOrEqual(date),
          validTo: IsNull(),
        },
      ],
      order: { validFrom: 'DESC' },
    });

    return rate;
  }

  /**
   * Get rate for a specific month and year
   */
  async getRateForPeriod(rateType: ZusRateType, month: number, year: number): Promise<number> {
    // Use the first day of the month for rate lookup
    const date = new Date(year, month - 1, 1);
    const rate = await this.getRateForDate(rateType, date);
    return rate?.value ?? this.getDefaultRate(rateType);
  }

  /**
   * Get all current rates
   */
  async getAllCurrentRates(): Promise<Record<ZusRateType, number>> {
    await this.ensureCacheIsValid();

    const rates: Record<string, number> = {};
    for (const rateType of Object.values(ZusRateType)) {
      rates[rateType] = await this.getCurrentRate(rateType);
    }

    return rates as Record<ZusRateType, number>;
  }

  /**
   * Seed default rates for 2025 (to be called during initialization)
   */
  async seedDefaultRates(): Promise<void> {
    for (const rateData of DEFAULT_ZUS_RATES_2025) {
      const existing = await this.zusRateRepository.findOne({
        where: {
          rateType: rateData.rateType,
          validFrom: new Date(rateData.validFrom),
        },
      });

      if (!existing) {
        const rate = this.zusRateRepository.create({
          rateType: rateData.rateType,
          value: rateData.value,
          validFrom: new Date(rateData.validFrom),
          description: rateData.description,
        });

        await this.zusRateRepository.save(rate);
        this.logger.log(`Seeded ZUS rate: ${rateData.rateType}`);
      }
    }

    // Refresh cache after seeding
    await this.refreshCache();
  }

  /**
   * Update or create a rate
   */
  async upsertRate(
    rateType: ZusRateType,
    value: number,
    validFrom: Date,
    validTo?: Date,
    description?: string
  ): Promise<ZusRate> {
    // Close the previous rate period
    const previousRate = await this.zusRateRepository.findOne({
      where: { rateType, validTo: IsNull() },
      order: { validFrom: 'DESC' },
    });

    if (previousRate && previousRate.validFrom < validFrom) {
      previousRate.validTo = new Date(validFrom.getTime() - 24 * 60 * 60 * 1000);
      await this.zusRateRepository.save(previousRate);
    }

    // Create new rate
    const newRate = this.zusRateRepository.create({
      rateType,
      value,
      validFrom,
      validTo,
      description,
    });

    const saved = await this.zusRateRepository.save(newRate);

    // Invalidate cache
    this.lastCacheRefresh = null;

    return saved;
  }

  /**
   * Get default rate value (hardcoded fallback)
   */
  private getDefaultRate(rateType: ZusRateType): number {
    const defaultRate = DEFAULT_ZUS_RATES_2025.find((r) => r.rateType === rateType);
    return defaultRate?.value ?? 0;
  }

  /**
   * Ensure cache is valid and refresh if needed
   */
  private async ensureCacheIsValid(): Promise<void> {
    const now = new Date();

    if (
      this.lastCacheRefresh &&
      now.getTime() - this.lastCacheRefresh.getTime() < this.CACHE_TTL_MS
    ) {
      return;
    }

    await this.refreshCache();
  }

  /**
   * Refresh the rates cache from database
   */
  private async refreshCache(): Promise<void> {
    const now = new Date();

    for (const rateType of Object.values(ZusRateType)) {
      const rate = await this.getRateForDate(rateType, now);
      this.ratesCache.set(rateType, rate?.value ?? this.getDefaultRate(rateType));
    }

    this.lastCacheRefresh = now;
    this.logger.debug('ZUS rates cache refreshed');
  }
}
