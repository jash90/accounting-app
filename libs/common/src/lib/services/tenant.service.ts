import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/user-role.enum';

/**
 * Service for handling multi-tenant company resolution.
 * Provides centralized logic for determining the effective company ID
 * based on user role and context.
 */
@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * Gets the effective company ID for multi-tenant operations.
   * - For ADMIN users: Returns the system company ID
   * - For other users: Returns their assigned company ID
   *
   * @param user - The authenticated user
   * @returns The effective company ID for data isolation
   * @throws ForbiddenException if system company not found for admin users
   */
  async getEffectiveCompanyId(user: User): Promise<string> {
    if (user.role === UserRole.ADMIN) {
      const systemCompany = await this.companyRepository.findOne({
        where: { isSystemCompany: true },
      });
      if (!systemCompany) {
        throw new ForbiddenException('System company not found for admin user');
      }
      return systemCompany.id;
    }
    if (!user.companyId) {
      throw new ForbiddenException('User is not assigned to any company');
    }
    return user.companyId;
  }
}
