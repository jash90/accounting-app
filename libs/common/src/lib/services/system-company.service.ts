import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

/**
 * Service for managing system company lookups with caching.
 * Eliminates duplicate getSystemCompany() calls across services.
 * Caches the system company ID on module initialization.
 *
 * This is a shared service that should be imported from @accounting/common
 * and used across all modules that need to access the System Admin Company.
 */
@Injectable()
export class SystemCompanyService implements OnModuleInit {
  private readonly logger = new Logger(SystemCompanyService.name);
  private cachedSystemCompany: Company | null = null;
  private cacheInitialized = false;

  constructor(
    @InjectRepository(Company)
    private companyRepository: Repository<Company>
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.initializeCache();
    } catch (error) {
      this.logger.warn(
        'Could not initialize system company cache on startup. Will retry on first access.',
        error instanceof Error ? error.message : error
      );
    }
  }

  private async initializeCache(): Promise<void> {
    if (this.cacheInitialized && this.cachedSystemCompany) {
      return;
    }

    const systemCompany = await this.companyRepository.findOne({
      where: { isSystemCompany: true },
    });

    if (systemCompany) {
      this.cachedSystemCompany = systemCompany;
      this.cacheInitialized = true;
      this.logger.log(`System company cached: ${systemCompany.name} (${systemCompany.id})`);
    }
  }

  /**
   * Get the system company with caching.
   * The system company is cached on first access and reused for all subsequent calls.
   * @throws NotFoundException if system company is not found in database
   */
  async getSystemCompany(): Promise<Company> {
    if (this.cachedSystemCompany) {
      return this.cachedSystemCompany;
    }

    // Try to initialize cache if not done yet
    await this.initializeCache();

    if (!this.cachedSystemCompany) {
      throw new NotFoundException('System Admin company not found. Please run: npm run seed');
    }

    return this.cachedSystemCompany;
  }

  /**
   * Get just the system company ID (most common use case)
   */
  async getSystemCompanyId(): Promise<string> {
    const company = await this.getSystemCompany();
    return company.id;
  }

  /**
   * Get the company ID for a user, resolving to system company for ADMIN users.
   * This is the preferred method to get companyId for multi-tenant queries.
   */
  async getCompanyIdForUser(user: User): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      return this.getSystemCompanyId();
    }
    return user.companyId!;
  }

  /**
   * Invalidate the cache (useful for testing or when system company changes)
   */
  invalidateCache(): void {
    this.cachedSystemCompany = null;
    this.cacheInitialized = false;
    this.logger.log('System company cache invalidated');
  }
}
