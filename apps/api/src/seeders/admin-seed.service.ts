
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';

import { User, UserRole } from '@accounting/common';

/**
 * Service for auto-seeding admin user in production deployments (e.g. Railway).
 * Uses repository pattern instead of raw SQL for type safety and schema consistency.
 */
@Injectable()
export class AdminSeedService {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  /**
   * Seeds an admin user if one doesn't already exist.
   * Called during production bootstrap to ensure initial admin access.
   */
  async seedIfNotExists(): Promise<void> {
    try {
      const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@system.com';

      const existingAdmin = await this.userRepository.findOne({
        where: { email: adminEmail },
      });

      if (existingAdmin) {
        this.logger.log('Admin user already exists, skipping seed.');
        return;
      }

      this.logger.log('Creating admin user...');

      let adminPassword = process.env.ADMIN_SEED_PASSWORD;
      let passwordGenerated = false;

      if (!adminPassword) {
        if (process.env.NODE_ENV === 'production') {
          this.logger.error('ADMIN_SEED_PASSWORD environment variable is required in production');
          this.logger.error('Set ADMIN_SEED_PASSWORD to a secure password before deploying');
          process.exit(1);
        }
        // Generate cryptographically secure random password (24 chars) for non-production
        adminPassword = randomBytes(18).toString('base64url');
        passwordGenerated = true;
      }

      const hashedPassword = await hash(adminPassword, 10);

      const adminUser = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        companyId: null,
        isActive: true,
      });

      await this.userRepository.save(adminUser);

      this.logger.log(`Admin user created: ${adminEmail}`);
      if (passwordGenerated) {
        this.logger.warn('A random password was generated.');
        this.logger.log('Set ADMIN_SEED_PASSWORD env var to use a specific password.');
        this.logger.log('Re-deploy with ADMIN_SEED_PASSWORD set to access admin account.');
      } else {
        this.logger.log('Password set from ADMIN_SEED_PASSWORD environment variable.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Auto-seed failed (non-critical): ${errorMessage}`);
      // Don't throw - allow app to start even if seed fails
    }
  }
}
