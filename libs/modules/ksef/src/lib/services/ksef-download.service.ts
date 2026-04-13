import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  Client,
  KsefInvoice,
  KsefInvoiceDirection,
  KsefInvoiceStatus,
  KsefInvoiceType,
} from '@accounting/common';
import { SystemCompanyService } from '@accounting/common/backend';

import { KSEF_API_PATHS } from '../constants';
import { KsefSyncResultDto } from '../dto';
import type { KsefInvoiceMetadata, KsefQueryInvoicesResponse } from '../generated';
import { KsefAuditLogService } from './ksef-audit-log.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefHttpClientService } from './ksef-http-client.service';

@Injectable()
export class KsefDownloadService {
  private readonly logger = new Logger(KsefDownloadService.name);

  constructor(
    @InjectRepository(KsefInvoice)
    private readonly invoiceRepo: Repository<KsefInvoice>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly httpClient: KsefHttpClientService,
    private readonly configService: KsefConfigService,
    private readonly cryptoService: KsefCryptoService,
    private readonly auditLogService: KsefAuditLogService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  async downloadSingle(
    ksefNumber: string,
    companyId: string,
    userId: string,
  ): Promise<KsefInvoice> {
    const config = await this.configService.getConfigOrFail(companyId);

    const path = KSEF_API_PATHS.INVOICE_GET.replace(
      '{ksefNumber}',
      ksefNumber,
    );

    // KSeF returns invoice as raw XML (content-type: application/xml)
    // We need to accept both JSON and XML responses
    const response = await this.httpClient.request<string>({
      environment: config.environment,
      method: 'GET',
      path,
      companyId,
      userId,
      auditAction: 'INVOICE_DOWNLOAD',
      auditEntityType: 'KsefInvoice',
      responseType: 'text',
    });

    // Response can be raw XML string or JSON object
    const invoiceXml = typeof response.data === 'string'
      ? response.data
      : (response.data as Record<string, unknown>).invoiceXml as string;

    // Parse the XML to extract metadata
    const { KsefXmlService } = await import('./ksef-xml.service');
    const xmlService = new KsefXmlService();
    const parsedInvoice = xmlService.parseInvoiceXml(invoiceXml);

    // Check if invoice already exists
    const existing = await this.invoiceRepo.findOne({
      where: { ksefNumber, companyId },
    });

    if (existing) {
      existing.xmlContent = invoiceXml;
      existing.rawKsefResponse = { invoiceXml, ksefNumber } as unknown as Record<string, unknown>;
      return this.invoiceRepo.save(existing);
    }

    // Try to match seller to a client by NIP (incoming = seller is the counterparty)
    const client = parsedInvoice.sellerNip
      ? await this.matchClientByNip(companyId, parsedInvoice.sellerNip)
      : null;

    const invoice = this.invoiceRepo.create({
      companyId,
      clientId: client?.id ?? null,
      invoiceType: KsefInvoiceType.PURCHASE,
      direction: KsefInvoiceDirection.INCOMING,
      invoiceNumber: parsedInvoice.invoiceNumber || ksefNumber,
      ksefNumber,
      status: KsefInvoiceStatus.ACCEPTED,
      issueDate: new Date(parsedInvoice.issueDate),
      sellerNip: parsedInvoice.sellerNip,
      sellerName: parsedInvoice.sellerName,
      buyerNip: parsedInvoice.buyerNip ?? null,
      buyerName: parsedInvoice.buyerName ?? '',
      netAmount: parsedInvoice.netAmount ?? 0,
      vatAmount: parsedInvoice.vatAmount ?? 0,
      grossAmount: parsedInvoice.grossAmount ?? 0,
      currency: parsedInvoice.currency,
      xmlContent: invoiceXml,
      xmlHash: this.cryptoService.computeSha256(invoiceXml),
      rawKsefResponse: { invoiceXml, ksefNumber } as unknown as Record<string, unknown>,
      acceptedAt: new Date(),
      createdById: userId,
    });

    const saved = await this.invoiceRepo.save(invoice);

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'INVOICE_DOWNLOADED',
      entityType: 'KsefInvoice',
      entityId: saved.id,
    });

    return saved;
  }

  /**
   * Query invoice metadata from KSeF v2 API with automatic pagination.
   *
   * KSeF v2 pagination rules (sortOrder=Asc, dateType=PermanentStorage):
   * - hasMore=false → done
   * - hasMore=true, isTruncated=false → increment pageOffset
   * - hasMore=true, isTruncated=true → narrow dateRange.from to last record's date, reset pageOffset
   */
  async queryInvoiceMetadata(
    filters: { dateFrom: string; dateTo: string; subjectType?: string },
    companyId: string,
    userId: string,
  ): Promise<KsefInvoiceMetadata[]> {
    const config = await this.configService.getConfigOrFail(companyId);
    const allInvoices: KsefInvoiceMetadata[] = [];
    const subjectType = filters.subjectType ?? 'Subject2';

    let currentFrom = filters.dateFrom;
    let pageOffset = 0;
    let requestCount = 0;

    while (requestCount++ < 200) {
      const queryParams = `?pageSize=250&pageOffset=${pageOffset}&sortOrder=Asc`;

      const response = await this.httpClient.request<KsefQueryInvoicesResponse>({
        environment: config.environment,
        method: 'POST',
        path: KSEF_API_PATHS.INVOICE_QUERY_METADATA + queryParams,
        data: {
          subjectType,
          dateRange: {
            dateType: 'PermanentStorage',
            from: currentFrom,
            ...(filters.dateTo ? { to: filters.dateTo } : {}),
          },
        },
        companyId,
        userId,
        auditAction: 'INVOICE_QUERY_METADATA',
      });

      const page = response.data;
      if (page.invoices?.length) {
        allInvoices.push(...page.invoices);
      }

      if (!page.hasMore) break;

      if (page.isTruncated) {
        // 10k limit hit — narrow dateRange from last record, reset page
        const lastInvoice = page.invoices[page.invoices.length - 1];
        currentFrom = lastInvoice.permanentStorageDate;
        pageOffset = 0;
      } else {
        pageOffset++;
      }
    }

    return allInvoices;
  }

  async syncIncoming(
    companyId: string,
    userId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<KsefSyncResultDto> {
    const metadata = await this.queryInvoiceMetadata(
      { dateFrom, dateTo },
      companyId,
      userId,
    );

    let newInvoices = 0;
    let updatedInvoices = 0;
    let errors = 0;
    const failedInvoices: Array<{ ksefNumber: string; error: string }> = [];

    for (const item of metadata) {
      try {
        const existing = await this.invoiceRepo.findOne({
          where: { ksefNumber: item.ksefNumber, companyId },
        });

        if (existing) {
          updatedInvoices++;
          continue;
        }

        await this.downloadSingle(item.ksefNumber, companyId, userId);
        newInvoices++;
      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        failedInvoices.push({ ksefNumber: item.ksefNumber, error: errorMessage });
        this.logger.warn(
          `Failed to download invoice ${item.ksefNumber}: ${errorMessage}`,
        );
      }
    }

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'SYNC_COMPLETED',
      responseSnippet: JSON.stringify({
        totalFound: metadata.length,
        newInvoices,
        updatedInvoices,
        errors,
      }),
    });

    const result = new KsefSyncResultDto();
    result.totalFound = metadata.length;
    result.newInvoices = newInvoices;
    result.updatedInvoices = updatedInvoices;
    result.errors = errors;
    result.syncedAt = new Date().toISOString();
    result.failedInvoices = failedInvoices.length > 0 ? failedInvoices : undefined;
    return result;
  }

  private async matchClientByNip(
    companyId: string,
    nip: string,
  ): Promise<Client | null> {
    return this.clientRepo.findOne({
      where: { companyId, nip },
    });
  }
}
