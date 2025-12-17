import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Company, UserRole } from '@accounting/common';

export interface AdminContextDto {
  currentContext: {
    companyId: string;
    companyName: string;
    isTestCompany: boolean;
    isSystemCompany: boolean;
  } | null;
  availableContexts: {
    companyId: string;
    companyName: string;
    isTestCompany: boolean;
    isSystemCompany: boolean;
  }[];
}

@Injectable()
export class AdminContextService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
  ) {}

  /**
   * Get current admin context and available contexts to switch to
   */
  async getContext(userId: string): Promise<AdminContextDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['company', 'activeCompany'],
    });

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Tylko administratorzy mogą zarządzać kontekstem firmy');
    }

    // Get all available contexts: System Admin company + Test companies
    const availableCompanies = await this.companyRepository.find({
      where: [
        { isSystemCompany: true, isActive: true },
        { isTestCompany: true, isActive: true },
      ],
      order: { isSystemCompany: 'DESC', name: 'ASC' },
    });

    const availableContexts = availableCompanies.map((company) => ({
      companyId: company.id,
      companyName: company.name,
      isTestCompany: company.isTestCompany,
      isSystemCompany: company.isSystemCompany,
    }));

    // Determine current context
    let currentContext: AdminContextDto['currentContext'] = null;

    if (user.activeCompanyId && user.activeCompany) {
      currentContext = {
        companyId: user.activeCompany.id,
        companyName: user.activeCompany.name,
        isTestCompany: user.activeCompany.isTestCompany,
        isSystemCompany: user.activeCompany.isSystemCompany,
      };
    } else if (user.companyId && user.company) {
      currentContext = {
        companyId: user.company.id,
        companyName: user.company.name,
        isTestCompany: user.company.isTestCompany,
        isSystemCompany: user.company.isSystemCompany,
      };
    }

    return {
      currentContext,
      availableContexts,
    };
  }

  /**
   * Switch admin's active company context
   */
  async switchContext(userId: string, targetCompanyId: string): Promise<AdminContextDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Tylko administratorzy mogą przełączać kontekst firmy');
    }

    // Validate target company
    const targetCompany = await this.companyRepository.findOne({
      where: { id: targetCompanyId },
    });

    if (!targetCompany) {
      throw new NotFoundException('Firma docelowa nie znaleziona');
    }

    if (!targetCompany.isActive) {
      throw new BadRequestException('Nie można przełączyć na nieaktywną firmę');
    }

    // Only allow switching to test companies or system company
    if (!targetCompany.isTestCompany && !targetCompany.isSystemCompany) {
      throw new ForbiddenException('Administratorzy mogą przełączać tylko na firmę testową lub System Admin');
    }

    // Update user's active company
    await this.userRepository.update(userId, {
      activeCompanyId: targetCompanyId,
    });

    return this.getContext(userId);
  }

  /**
   * Reset admin's context back to System Admin (default)
   */
  async resetContext(userId: string): Promise<AdminContextDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Tylko administratorzy mogą resetować kontekst firmy');
    }

    // Clear active company to use default (System Admin)
    await this.userRepository.update(userId, {
      activeCompanyId: null,
    });

    return this.getContext(userId);
  }
}
