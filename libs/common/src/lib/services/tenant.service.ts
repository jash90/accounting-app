import { Injectable } from '@nestjs/common';

import { SystemCompanyService } from './system-company.service';
import { User } from '../entities/user.entity';

/**
 * Service for handling multi-tenant company resolution.
 *
 * @deprecated Use SystemCompanyService.getCompanyIdForUser() directly.
 * TenantService is kept for backward compatibility and delegates all calls
 * to SystemCompanyService which caches the system company lookup.
 */
@Injectable()
export class TenantService {
  constructor(private readonly systemCompanyService: SystemCompanyService) {}

  /**
   * Gets the effective company ID for multi-tenant operations.
   *
   * @deprecated Use SystemCompanyService.getCompanyIdForUser(user) directly.
   */
  getEffectiveCompanyId(user: User): Promise<string> {
    return this.systemCompanyService.getCompanyIdForUser(user);
  }
}
