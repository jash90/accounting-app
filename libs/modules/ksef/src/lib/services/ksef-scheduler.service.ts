import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { KsefInvoice, KsefInvoiceStatus } from '@accounting/common';

import { KSEF_API_PATHS } from '../constants';
import { KsefConfigService } from './ksef-config.service';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KsefInvoiceService } from './ksef-invoice.service';
import { KsefSessionService } from './ksef-session.service';

interface InvoiceStatusResponse {
  processingCode: number;
  processingDescription: string;
  ksefNumber?: string;
  validationErrors?: Record<string, unknown>[];
}

@Injectable()
export class KsefSchedulerService {
  private readonly logger = new Logger(KsefSchedulerService.name);

  constructor(
    @InjectRepository(KsefInvoice)
    private readonly invoiceRepo: Repository<KsefInvoice>,
    private readonly httpClient: KsefHttpClientService,
    private readonly configService: KsefConfigService,
    private readonly invoiceService: KsefInvoiceService,
    private readonly sessionService: KsefSessionService,
  ) {}

  @Cron('*/5 * * * *')
  async pollPendingStatuses(): Promise<void> {
    const pendingInvoices = await this.invoiceRepo.find({
      where: { status: KsefInvoiceStatus.SUBMITTED },
      take: 50,
      order: { submittedAt: 'ASC' },
    });

    if (pendingInvoices.length === 0) return;

    this.logger.log(`Polling status for ${pendingInvoices.length} submitted invoices`);

    // Group by companyId for config lookup efficiency
    const byCompany = new Map<string, KsefInvoice[]>();
    for (const inv of pendingInvoices) {
      const list = byCompany.get(inv.companyId) ?? [];
      list.push(inv);
      byCompany.set(inv.companyId, list);
    }

    for (const [companyId, invoices] of byCompany) {
      try {
        const config = await this.configService.getConfig(companyId);
        if (!config) continue;

        for (const invoice of invoices) {
          if (!invoice.ksefReferenceNumber) continue;

          try {
            const path = `/invoices/status/${invoice.ksefReferenceNumber}`;

            const response = await this.httpClient.request<InvoiceStatusResponse>({
              environment: config.environment,
              method: 'GET',
              path,
              companyId,
              userId: invoice.createdById,
              auditAction: 'INVOICE_STATUS_POLL',
              auditEntityType: 'KsefInvoice',
              auditEntityId: invoice.id,
            });

            const { processingCode, ksefNumber, validationErrors } = response.data;

            // processingCode 200 = accepted, 400 = rejected
            if (processingCode === 200) {
              await this.invoiceService.updateInvoiceStatus(
                invoice.id,
                KsefInvoiceStatus.ACCEPTED,
                { ksefNumber },
              );
            } else if (processingCode >= 400) {
              await this.invoiceService.updateInvoiceStatus(
                invoice.id,
                KsefInvoiceStatus.REJECTED,
                { validationErrors },
              );
            }
            // Other codes: still processing, no action needed
          } catch (error) {
            this.logger.warn(
              `Failed to poll status for invoice ${invoice.id}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to process company ${companyId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  @Cron('0 * * * *')
  async expireStaleSessions(): Promise<void> {
    try {
      const count = await this.sessionService.expireStaleSessions();
      if (count > 0) {
        this.logger.log(`Expired ${count} stale sessions`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to expire stale sessions: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
