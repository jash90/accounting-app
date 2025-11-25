import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenLimit, User, UserRole } from '@accounting/common';
import { SetTokenLimitDto } from '../dto/set-token-limit.dto';
import { TokenUsageService } from './token-usage.service';
import { SystemCompanyService } from './system-company.service';

@Injectable()
export class TokenLimitService {
  constructor(
    @InjectRepository(TokenLimit)
    private limitRepository: Repository<TokenLimit>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(forwardRef(() => TokenUsageService))
    private tokenUsageService: TokenUsageService,
    private systemCompanyService: SystemCompanyService,
  ) {}

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  /**
   * Set company-wide limit (ADMIN only)
   */
  async setCompanyLimit(
    companyId: string,
    setDto: SetTokenLimitDto,
    user: User,
  ): Promise<TokenLimit> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can set company limits');
    }

    let limit = await this.limitRepository.findOne({
      where: { companyId, userId: null },
    });

    if (limit) {
      limit.monthlyLimit = setDto.monthlyLimit;
      limit.warningThresholdPercentage = setDto.warningThresholdPercentage ?? 80;
      limit.notifyOnWarning = setDto.notifyOnWarning ?? true;
      limit.notifyOnExceeded = setDto.notifyOnExceeded ?? true;
      limit.setById = user.id;
    } else {
      limit = this.limitRepository.create({
        companyId,
        userId: null,
        monthlyLimit: setDto.monthlyLimit,
        warningThresholdPercentage: setDto.warningThresholdPercentage ?? 80,
        notifyOnWarning: setDto.notifyOnWarning ?? true,
        notifyOnExceeded: setDto.notifyOnExceeded ?? true,
        setById: user.id,
      });
    }

    return this.limitRepository.save(limit);
  }

  /**
   * Set user-specific limit (COMPANY_OWNER only)
   */
  async setUserLimit(
    userId: string,
    setDto: SetTokenLimitDto,
    user: User,
  ): Promise<TokenLimit> {
    if (user.role !== UserRole.COMPANY_OWNER) {
      throw new ForbiddenException('Only company owners can set user limits');
    }

    const companyId = user.companyId;
    if (!companyId) {
      throw new ForbiddenException('User not associated with company');
    }

    // Verify target user belongs to owner's company
    const targetUser = await this.findUserById(userId);
    if (!targetUser) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    if (targetUser.companyId !== companyId) {
      throw new ForbiddenException('Cannot set limits for users outside your company');
    }

    let limit = await this.limitRepository.findOne({
      where: { companyId, userId },
    });

    if (limit) {
      limit.monthlyLimit = setDto.monthlyLimit;
      limit.warningThresholdPercentage = setDto.warningThresholdPercentage ?? 80;
      limit.notifyOnWarning = setDto.notifyOnWarning ?? true;
      limit.notifyOnExceeded = setDto.notifyOnExceeded ?? true;
      limit.setById = user.id;
    } else {
      limit = this.limitRepository.create({
        companyId,
        userId,
        monthlyLimit: setDto.monthlyLimit,
        warningThresholdPercentage: setDto.warningThresholdPercentage ?? 80,
        notifyOnWarning: setDto.notifyOnWarning ?? true,
        notifyOnExceeded: setDto.notifyOnExceeded ?? true,
        setById: user.id,
      });
    }

    return this.limitRepository.save(limit);
  }

  /**
   * Check if user can send message (not exceeded limit)
   */
  async checkLimit(user: User): Promise<void> {
    let companyId: string | null;

    if (user.role === UserRole.ADMIN) {
      companyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      companyId = user.companyId;
    }

    // Check user-specific limit first
    const userLimit = await this.limitRepository.findOne({
      where: { companyId, userId: user.id },
    });

    if (userLimit) {
      const userUsage = await this.tokenUsageService.getUserMonthlyTotal(user);
      if (userUsage >= userLimit.monthlyLimit) {
        throw new BadRequestException(
          `Monthly token limit exceeded (${userUsage}/${userLimit.monthlyLimit}). Please contact your administrator.`,
        );
      }
    }

    // Check company-wide limit
    const companyLimit = await this.limitRepository.findOne({
      where: { companyId, userId: null },
    });

    if (companyLimit && companyId) {
      const companyUsage = await this.tokenUsageService.getCompanyMonthlyTotal(companyId);
      if (companyUsage >= companyLimit.monthlyLimit) {
        throw new BadRequestException(
          `Company monthly token limit exceeded (${companyUsage}/${companyLimit.monthlyLimit}). Please contact your administrator.`,
        );
      }
    }
  }

  /**
   * Get user's limit with current usage
   */
  async getMyLimit(user: User): Promise<any> {
    let companyId: string | null;

    if (user.role === UserRole.ADMIN) {
      companyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      companyId = user.companyId;
    }

    const userLimit = await this.limitRepository.findOne({
      where: { companyId, userId: user.id },
      relations: ['user', 'company', 'setBy'],
    });

    const companyLimit = await this.limitRepository.findOne({
      where: { companyId, userId: null },
      relations: ['company', 'setBy'],
    });

    const userUsage = await this.tokenUsageService.getUserMonthlyTotal(user);
    const companyUsage = companyId
      ? await this.tokenUsageService.getCompanyMonthlyTotal(companyId)
      : 0;

    return {
      userLimit: userLimit
        ? {
            ...userLimit,
            currentUsage: userUsage,
            usagePercentage: (userUsage / userLimit.monthlyLimit) * 100,
            isExceeded: userUsage >= userLimit.monthlyLimit,
            isWarning: userUsage >= (userLimit.monthlyLimit * userLimit.warningThresholdPercentage) / 100,
          }
        : null,
      companyLimit: companyLimit
        ? {
            ...companyLimit,
            currentUsage: companyUsage,
            usagePercentage: (companyUsage / companyLimit.monthlyLimit) * 100,
            isExceeded: companyUsage >= companyLimit.monthlyLimit,
            isWarning: companyUsage >= (companyLimit.monthlyLimit * companyLimit.warningThresholdPercentage) / 100,
          }
        : null,
    };
  }
}
