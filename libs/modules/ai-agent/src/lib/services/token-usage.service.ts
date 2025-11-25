import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TokenUsage, User, UserRole, Company } from '@accounting/common';
import { TokenUsageStatsDto } from '../dto/token-usage-response.dto';
import { SystemCompanyService } from './system-company.service';

interface CompanyTokenUsageDto {
  companyId: string;
  companyName: string;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  userCount: number;
  conversationCount: number;
  messageCount: number;
  users: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    conversationCount: number;
    messageCount: number;
  }[];
}

@Injectable()
export class TokenUsageService {
  constructor(
    @InjectRepository(TokenUsage)
    private usageRepository: Repository<TokenUsage>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    private systemCompanyService: SystemCompanyService,
  ) {}

  /**
   * Track token usage for a user
   */
  async trackUsage(user: User, inputTokens: number, outputTokens: number): Promise<void> {
    let companyId: string | null;

    if (user.role === UserRole.ADMIN) {
      companyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      companyId = user.companyId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create usage record for today
    let usage = await this.usageRepository.findOne({
      where: {
        userId: user.id,
        companyId,
        date: today,
      },
    });

    if (usage) {
      usage.totalInputTokens += inputTokens;
      usage.totalOutputTokens += outputTokens;
      usage.totalTokens += inputTokens + outputTokens;
      usage.messageCount += 1;
    } else {
      usage = this.usageRepository.create({
        userId: user.id,
        companyId,
        date: today,
        totalInputTokens: inputTokens,
        totalOutputTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
        conversationCount: 1,
        messageCount: 1,
      });
    }

    await this.usageRepository.save(usage);
  }

  /**
   * Get user's own usage statistics
   */
  async getMyUsage(user: User, days = 30): Promise<TokenUsageStatsDto> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let companyId: string | null;
    if (user.role === UserRole.ADMIN) {
      companyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      companyId = user.companyId;
    }

    const dailyUsage = await this.usageRepository.find({
      where: {
        userId: user.id,
        companyId,
        date: Between(startDate, endDate),
      },
      relations: ['user', 'company'],
      order: { date: 'ASC' },
    });

    const totals = dailyUsage.reduce(
      (acc, usage) => ({
        totalTokens: acc.totalTokens + usage.totalTokens,
        totalInputTokens: acc.totalInputTokens + usage.totalInputTokens,
        totalOutputTokens: acc.totalOutputTokens + usage.totalOutputTokens,
        conversationCount: acc.conversationCount + usage.conversationCount,
        messageCount: acc.messageCount + usage.messageCount,
      }),
      {
        totalTokens: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        conversationCount: 0,
        messageCount: 0,
      },
    );

    return {
      ...totals,
      periodStart: startDate,
      periodEnd: endDate,
      dailyUsage,
    };
  }

  /**
   * Get company usage (COMPANY_OWNER only)
   * Returns CompanyTokenUsageDto format with user breakdown
   */
  async getCompanyUsage(user: User, days = 30): Promise<CompanyTokenUsageDto> {
    if (user.role !== UserRole.COMPANY_OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only company owners can view company usage');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let companyId: string;
    let companyName = 'System Admin';
    if (user.role === UserRole.ADMIN) {
      companyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      companyId = user.companyId!;
      // Get company name
      const company = await this.companyRepository.findOne({
        where: { id: companyId },
      });
      if (company) {
        companyName = company.name;
      }
    }

    // Get all usage records for this company in the period
    const usageRecords = await this.usageRepository.find({
      where: {
        companyId,
        date: Between(startDate, endDate),
      },
      relations: ['user'],
    });

    // Aggregate by user
    const userAggregation = new Map<string, {
      userId: string;
      email: string;
      firstName: string;
      lastName: string;
      totalTokens: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      conversationCount: number;
      messageCount: number;
    }>();

    let companyTotalTokens = 0;
    let companyTotalInputTokens = 0;
    let companyTotalOutputTokens = 0;
    let companyConversationCount = 0;
    let companyMessageCount = 0;

    for (const record of usageRecords) {
      companyTotalTokens += record.totalTokens;
      companyTotalInputTokens += record.totalInputTokens;
      companyTotalOutputTokens += record.totalOutputTokens;
      companyConversationCount += record.conversationCount;
      companyMessageCount += record.messageCount;

      if (record.user) {
        const existing = userAggregation.get(record.userId);
        if (existing) {
          existing.totalTokens += record.totalTokens;
          existing.totalInputTokens += record.totalInputTokens;
          existing.totalOutputTokens += record.totalOutputTokens;
          existing.conversationCount += record.conversationCount;
          existing.messageCount += record.messageCount;
        } else {
          userAggregation.set(record.userId, {
            userId: record.userId,
            email: record.user.email,
            firstName: record.user.firstName,
            lastName: record.user.lastName,
            totalTokens: record.totalTokens,
            totalInputTokens: record.totalInputTokens,
            totalOutputTokens: record.totalOutputTokens,
            conversationCount: record.conversationCount,
            messageCount: record.messageCount,
          });
        }
      }
    }

    return {
      companyId,
      companyName,
      totalTokens: companyTotalTokens,
      totalInputTokens: companyTotalInputTokens,
      totalOutputTokens: companyTotalOutputTokens,
      userCount: userAggregation.size,
      conversationCount: companyConversationCount,
      messageCount: companyMessageCount,
      users: Array.from(userAggregation.values()),
    };
  }

  /**
   * Get user's monthly total (for limit checking)
   */
  async getUserMonthlyTotal(user: User): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let companyId: string | null;
    if (user.role === UserRole.ADMIN) {
      companyId = await this.systemCompanyService.getSystemCompanyId();
    } else {
      companyId = user.companyId;
    }

    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'total')
      .where('usage.userId = :userId', { userId: user.id })
      .andWhere('usage.companyId = :companyId', { companyId })
      .andWhere('usage.date BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /**
   * Get company's monthly total (for limit checking)
   */
  async getCompanyMonthlyTotal(companyId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const result = await this.usageRepository
      .createQueryBuilder('usage')
      .select('SUM(usage.totalTokens)', 'total')
      .where('usage.companyId = :companyId', { companyId })
      .andWhere('usage.date BETWEEN :start AND :end', {
        start: startOfMonth,
        end: endOfMonth,
      })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  /**
   * Get token usage for all companies (ADMIN only)
   */
  async getAllCompaniesUsage(user: User, days = 30): Promise<CompanyTokenUsageDto[]> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only admins can view all companies usage');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get all non-system companies
    const companies = await this.companyRepository.find({
      where: { isSystemCompany: false },
      order: { name: 'ASC' },
    });

    const result: CompanyTokenUsageDto[] = [];

    for (const company of companies) {
      // Get all usage records for this company in the period
      const usageRecords = await this.usageRepository.find({
        where: {
          companyId: company.id,
          date: Between(startDate, endDate),
        },
        relations: ['user'],
      });

      // Aggregate by user
      const userAggregation = new Map<string, {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        totalTokens: number;
        totalInputTokens: number;
        totalOutputTokens: number;
        conversationCount: number;
        messageCount: number;
      }>();

      let companyTotalTokens = 0;
      let companyTotalInputTokens = 0;
      let companyTotalOutputTokens = 0;
      let companyConversationCount = 0;
      let companyMessageCount = 0;

      for (const record of usageRecords) {
        companyTotalTokens += record.totalTokens;
        companyTotalInputTokens += record.totalInputTokens;
        companyTotalOutputTokens += record.totalOutputTokens;
        companyConversationCount += record.conversationCount;
        companyMessageCount += record.messageCount;

        if (record.user) {
          const existing = userAggregation.get(record.userId);
          if (existing) {
            existing.totalTokens += record.totalTokens;
            existing.totalInputTokens += record.totalInputTokens;
            existing.totalOutputTokens += record.totalOutputTokens;
            existing.conversationCount += record.conversationCount;
            existing.messageCount += record.messageCount;
          } else {
            userAggregation.set(record.userId, {
              userId: record.userId,
              email: record.user.email,
              firstName: record.user.firstName,
              lastName: record.user.lastName,
              totalTokens: record.totalTokens,
              totalInputTokens: record.totalInputTokens,
              totalOutputTokens: record.totalOutputTokens,
              conversationCount: record.conversationCount,
              messageCount: record.messageCount,
            });
          }
        }
      }

      result.push({
        companyId: company.id,
        companyName: company.name,
        totalTokens: companyTotalTokens,
        totalInputTokens: companyTotalInputTokens,
        totalOutputTokens: companyTotalOutputTokens,
        userCount: userAggregation.size,
        conversationCount: companyConversationCount,
        messageCount: companyMessageCount,
        users: Array.from(userAggregation.values()),
      });
    }

    return result;
  }
}
