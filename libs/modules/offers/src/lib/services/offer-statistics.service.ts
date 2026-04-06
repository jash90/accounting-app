import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Offer, OfferStatus, User } from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { OfferStatisticsDto } from '../dto/offer-response.dto';

@Injectable()
export class OfferStatisticsService {
  constructor(
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
    private readonly systemCompanyService: SystemCompanyService
  ) {}

  async getStatistics(user: User): Promise<OfferStatisticsDto> {
    const companyId = await this.systemCompanyService.getCompanyIdForUser(user);

    const stats = await this.offerRepository
      .createQueryBuilder('offer')
      .select('offer.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(offer.totalNetAmount), 0)', 'totalValue')
      .where('offer.companyId = :companyId', { companyId })
      .groupBy('offer.status')
      .getRawMany();

    const statusCounts: Record<string, number> = {};
    const statusValues: Record<string, number> = {};
    let totalOffers = 0;
    let totalValue = 0;

    for (const stat of stats) {
      statusCounts[stat.status] = parseInt(stat.count, 10);
      statusValues[stat.status] = parseFloat(stat.totalValue) || 0;
      totalOffers += parseInt(stat.count, 10);
      totalValue += parseFloat(stat.totalValue) || 0;
    }

    const acceptedCount = statusCounts[OfferStatus.ACCEPTED] || 0;
    const rejectedCount = statusCounts[OfferStatus.REJECTED] || 0;
    const finishedOffers = acceptedCount + rejectedCount;
    const conversionRate = finishedOffers > 0 ? (acceptedCount / finishedOffers) * 100 : 0;

    return {
      totalOffers,
      draftCount: statusCounts[OfferStatus.DRAFT] || 0,
      readyCount: statusCounts[OfferStatus.READY] || 0,
      sentCount: statusCounts[OfferStatus.SENT] || 0,
      acceptedCount,
      rejectedCount,
      expiredCount: statusCounts[OfferStatus.EXPIRED] || 0,
      totalValue: Math.round(totalValue * 100) / 100,
      acceptedValue: Math.round((statusValues[OfferStatus.ACCEPTED] || 0) * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  }
}
