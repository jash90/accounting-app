import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { IsNull, Repository } from 'typeorm';

import { Company, TokenLimit, User, UserRole } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { TokenUsageService } from './token-usage.service';
import { SetTokenLimitDto } from '../dto/set-token-limit.dto';

interface TokenLimitWithUsage {
  id: string;
  companyId: string | null;
  userId: string | null;
  monthlyLimit: number;
  warningThresholdPercentage: number;
  notifyOnWarning: boolean;
  notifyOnExceeded: boolean;
  setById: string;
  createdAt: Date;
  updatedAt: Date;
  user?: User | null;
  company?: Company | null;
  setBy?: User | null;
  currentUsage: number;
  usagePercentage: number;
  isExceeded: boolean;
  isWarning: boolean;
}

interface MyLimitResult {
  userLimit: TokenLimitWithUsage | null;
  companyLimit: TokenLimitWithUsage | null;
}

@Injectable()
export class TokenLimitService {
  constructor(
    @InjectRepository(TokenLimit)
    private readonly limitRepository: Repository<TokenLimit>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tokenUsageService: TokenUsageService,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  /**
   * Find user by ID
   */
  findUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  /**
   * Set company-wide limit (ADMIN only)
   */
  async setCompanyLimit(
    companyId: string,
    setDto: SetTokenLimitDto,
    user: User
  ): Promise<TokenLimit> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can set company limits');
    }

    let limit = await this.limitRepository.findOne({
      where: { companyId, userId: IsNull() },
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
  async setUserLimit(userId: string, setDto: SetTokenLimitDto, user: User): Promise<TokenLimit> {
    if (user.role !== UserRole.COMPANY_OWNER) {
      throw new ForbiddenException('Only company owners can set user limits');
    }

    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);
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
  async enforceTokenLimit(user: User): Promise<void> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    // Check user-specific limit first
    const userLimit = await this.limitRepository.findOne({
      where: { companyId: companyId ?? IsNull(), userId: user.id },
    });

    if (userLimit) {
      const userUsage = await this.tokenUsageService.getUserMonthlyTotal(user);
      if (userUsage >= userLimit.monthlyLimit) {
        throw new BadRequestException(
          `Monthly token limit exceeded (${userUsage}/${userLimit.monthlyLimit}). Please contact your administrator.`
        );
      }
    }

    // Check company-wide limit
    const companyLimit = await this.limitRepository.findOne({
      where: { companyId: companyId ?? IsNull(), userId: IsNull() },
    });

    if (companyLimit && companyId) {
      const companyUsage = await this.tokenUsageService.getCompanyMonthlyTotal(companyId);
      if (companyUsage >= companyLimit.monthlyLimit) {
        throw new BadRequestException(
          `Company monthly token limit exceeded (${companyUsage}/${companyLimit.monthlyLimit}). Please contact your administrator.`
        );
      }
    }
  }

  /**
   * Set company limit and return enriched response with current usage stats
   */
  async setCompanyLimitWithUsage(
    companyId: string,
    setDto: SetTokenLimitDto,
    user: User
  ): Promise<
    TokenLimit & {
      currentUsage: number;
      usagePercentage: number;
      isExceeded: boolean;
      isWarning: boolean;
    }
  > {
    const limit = await this.setCompanyLimit(companyId, setDto, user);
    const currentUsage = await this.tokenUsageService.getCompanyMonthlyTotal(companyId);
    const usagePercentage = (currentUsage / limit.monthlyLimit) * 100;
    return {
      ...limit,
      currentUsage,
      usagePercentage,
      isExceeded: currentUsage >= limit.monthlyLimit,
      isWarning: currentUsage >= (limit.monthlyLimit * limit.warningThresholdPercentage) / 100,
    };
  }

  /**
   * Set user limit and return enriched response with current usage stats
   */
  async setUserLimitWithUsage(
    userId: string,
    setDto: SetTokenLimitDto,
    user: User
  ): Promise<
    | (TokenLimit & {
        currentUsage: number;
        usagePercentage: number;
        isExceeded: boolean;
        isWarning: boolean;
      })
    | TokenLimit
  > {
    const limit = await this.setUserLimit(userId, setDto, user);
    const userEntity = await this.findUserById(userId);
    if (userEntity) {
      const currentUsage = await this.tokenUsageService.getUserMonthlyTotal(userEntity);
      const usagePercentage = (currentUsage / limit.monthlyLimit) * 100;
      return {
        ...limit,
        currentUsage,
        usagePercentage,
        isExceeded: currentUsage >= limit.monthlyLimit,
        isWarning: currentUsage >= (limit.monthlyLimit * limit.warningThresholdPercentage) / 100,
      };
    }
    return limit;
  }

  /**
   * Get user's limit with current usage
   */
  async getMyLimit(user: User): Promise<MyLimitResult> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const userLimit = await this.limitRepository.findOne({
      where: { companyId: companyId ?? IsNull(), userId: user.id },
      relations: ['user', 'company', 'setBy'],
    });

    const companyLimit = await this.limitRepository.findOne({
      where: { companyId: companyId ?? IsNull(), userId: IsNull() },
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
            isWarning:
              userUsage >= (userLimit.monthlyLimit * userLimit.warningThresholdPercentage) / 100,
          }
        : null,
      companyLimit: companyLimit
        ? {
            ...companyLimit,
            currentUsage: companyUsage,
            usagePercentage: (companyUsage / companyLimit.monthlyLimit) * 100,
            isExceeded: companyUsage >= companyLimit.monthlyLimit,
            isWarning:
              companyUsage >=
              (companyLimit.monthlyLimit * companyLimit.warningThresholdPercentage) / 100,
          }
        : null,
    };
  }
}
