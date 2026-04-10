import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  KsefInvoice,
  KsefInvoiceStatus,
  KsefSession,
  KsefSessionStatus,
} from '@accounting/common';

import { KsefDashboardStatsDto } from '../dto';

@Injectable()
export class KsefStatsService {
  constructor(
    @InjectRepository(KsefInvoice)
    private readonly invoiceRepo: Repository<KsefInvoice>,
    @InjectRepository(KsefSession)
    private readonly sessionRepo: Repository<KsefSession>,
  ) {}

  async getDashboardStats(companyId: string): Promise<KsefDashboardStatsDto> {
    // Count by status
    const statusCounts = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('invoice.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('invoice.companyId = :companyId', { companyId })
      .groupBy('invoice.status')
      .getRawMany<{ status: KsefInvoiceStatus; count: string }>();

    const countMap = new Map(
      statusCounts.map((r) => [r.status, parseInt(r.count, 10)]),
    );

    // Sum amounts
    const amountResult = await this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('COALESCE(SUM(invoice.netAmount), 0)', 'totalNet')
      .addSelect('COALESCE(SUM(invoice.grossAmount), 0)', 'totalGross')
      .where('invoice.companyId = :companyId', { companyId })
      .getRawOne<{ totalNet: string; totalGross: string }>();

    // Check active session
    const activeSession = await this.sessionRepo.findOne({
      where: {
        companyId,
        status: KsefSessionStatus.ACTIVE,
      },
    });

    const dto = new KsefDashboardStatsDto();
    dto.totalInvoices = Array.from(countMap.values()).reduce(
      (sum, c) => sum + c,
      0,
    );
    dto.draftCount = countMap.get(KsefInvoiceStatus.DRAFT) ?? 0;
    dto.pendingCount =
      (countMap.get(KsefInvoiceStatus.PENDING_SUBMISSION) ?? 0) +
      (countMap.get(KsefInvoiceStatus.SUBMITTED) ?? 0);
    dto.acceptedCount = countMap.get(KsefInvoiceStatus.ACCEPTED) ?? 0;
    dto.rejectedCount = countMap.get(KsefInvoiceStatus.REJECTED) ?? 0;
    dto.errorCount = countMap.get(KsefInvoiceStatus.ERROR) ?? 0;
    dto.activeSessionExists = !!activeSession;
    dto.totalNetAmount = parseFloat(amountResult?.totalNet ?? '0');
    dto.totalGrossAmount = parseFloat(amountResult?.totalGross ?? '0');

    return dto;
  }
}
