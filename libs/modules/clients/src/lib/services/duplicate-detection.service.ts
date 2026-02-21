import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Not, Repository } from 'typeorm';

import { Client, User } from '@accounting/common';
import { TenantService } from '@accounting/common/backend';

import { DuplicateCheckResultDto, DuplicateClientInfo } from '../dto/bulk-operations.dto';

@Injectable()
export class DuplicateDetectionService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    private readonly tenantService: TenantService
  ) {}

  /**
   * Check for duplicate clients based on NIP and/or email.
   * Only checks within the same company (multi-tenant isolation).
   */
  async checkDuplicates(
    user: User,
    nip?: string,
    email?: string,
    excludeId?: string
  ): Promise<DuplicateCheckResultDto> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const byNip: DuplicateClientInfo[] = [];
    const byEmail: DuplicateClientInfo[] = [];

    // Check for NIP duplicates
    if (nip) {
      const nipDuplicates = await this.clientRepository.find({
        where: {
          companyId,
          nip,
          ...(excludeId ? { id: Not(excludeId) } : {}),
        },
        select: ['id', 'name', 'nip', 'email', 'isActive'],
      });

      for (const client of nipDuplicates) {
        byNip.push({
          id: client.id,
          name: client.name,
          nip: client.nip,
          email: client.email,
          isActive: client.isActive,
        });
      }
    }

    // Check for email duplicates
    if (email) {
      const emailDuplicates = await this.clientRepository.find({
        where: {
          companyId,
          email,
          ...(excludeId ? { id: Not(excludeId) } : {}),
        },
        select: ['id', 'name', 'nip', 'email', 'isActive'],
      });

      for (const client of emailDuplicates) {
        // Avoid adding the same client twice if both NIP and email match
        const alreadyInNip = byNip.some((c) => c.id === client.id);
        if (!alreadyInNip) {
          byEmail.push({
            id: client.id,
            name: client.name,
            nip: client.nip,
            email: client.email,
            isActive: client.isActive,
          });
        }
      }
    }

    return {
      hasDuplicates: byNip.length > 0 || byEmail.length > 0,
      byNip,
      byEmail,
    };
  }

  /**
   * Check if a specific NIP is already used by another client in the company.
   */
  async isNipTaken(user: User, nip: string, excludeId?: string): Promise<boolean> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const count = await this.clientRepository.count({
      where: {
        companyId,
        nip,
        isActive: true,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    return count > 0;
  }

  /**
   * Check if a specific email is already used by another client in the company.
   */
  async isEmailTaken(user: User, email: string, excludeId?: string): Promise<boolean> {
    const companyId = await this.tenantService.getEffectiveCompanyId(user);

    const count = await this.clientRepository.count({
      where: {
        companyId,
        email,
        isActive: true,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });

    return count > 0;
  }
}
