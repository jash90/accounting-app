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
import { KsefAuditLogService } from './ksef-audit-log.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefHttpClientService } from './ksef-http-client.service';

interface KsefInvoiceMetadata {
  ksefNumber: string;
  invoiceNumber?: string;
  issueDate: string;
  sellerNip: string;
  sellerName: string;
  buyerNip?: string;
  buyerName?: string;
  netAmount?: number;
  vatAmount?: number;
  grossAmount?: number;
}

interface MetadataQueryResponse {
  invoiceHeaderList: KsefInvoiceMetadata[];
  numberOfElements: number;
}

interface InvoiceDownloadResponse {
  invoiceXml: string;
  invoiceDetails: {
    ksefNumber: string;
    invoiceNumber: string;
    issueDate: string;
    sellerNip: string;
    sellerName: string;
    buyerNip: string;
    buyerName: string;
    netAmount: number;
    vatAmount: number;
    grossAmount: number;
  };
}

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

    const response = await this.httpClient.request<InvoiceDownloadResponse>({
      environment: config.environment,
      method: 'GET',
      path,
      companyId,
      userId,
      auditAction: 'INVOICE_DOWNLOAD',
      auditEntityType: 'KsefInvoice',
    });

    const { invoiceDetails, invoiceXml } = response.data;

    // Check if invoice already exists
    const existing = await this.invoiceRepo.findOne({
      where: { ksefNumber, companyId },
    });

    if (existing) {
      existing.xmlContent = invoiceXml;
      existing.rawKsefResponse = response.data as unknown as Record<string, unknown>;
      return this.invoiceRepo.save(existing);
    }

    // Try to match buyer to a client by NIP
    const client = invoiceDetails.sellerNip
      ? await this.matchClientByNip(companyId, invoiceDetails.sellerNip)
      : null;

    const invoice = this.invoiceRepo.create({
      companyId,
      clientId: client?.id ?? null,
      invoiceType: KsefInvoiceType.PURCHASE,
      direction: KsefInvoiceDirection.INCOMING,
      invoiceNumber: invoiceDetails.invoiceNumber ?? ksefNumber,
      ksefNumber,
      status: KsefInvoiceStatus.ACCEPTED,
      issueDate: new Date(invoiceDetails.issueDate),
      sellerNip: invoiceDetails.sellerNip,
      sellerName: invoiceDetails.sellerName,
      buyerNip: invoiceDetails.buyerNip ?? null,
      buyerName: invoiceDetails.buyerName ?? '',
      netAmount: invoiceDetails.netAmount ?? 0,
      vatAmount: invoiceDetails.vatAmount ?? 0,
      grossAmount: invoiceDetails.grossAmount ?? 0,
      currency: 'PLN',
      xmlContent: invoiceXml,
      xmlHash: this.cryptoService.computeSha256(invoiceXml),
      rawKsefResponse: response.data as unknown as Record<string, unknown>,
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

  async queryInvoiceMetadata(
    filters: { dateFrom: string; dateTo: string },
    companyId: string,
    userId: string,
  ): Promise<KsefInvoiceMetadata[]> {
    const config = await this.configService.getConfigOrFail(companyId);

    const response = await this.httpClient.request<MetadataQueryResponse>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.INVOICE_QUERY_METADATA,
      data: {
        queryCriteria: {
          subjectType: 'subject2', // buyer
          type: 'incremental',
          acquisitionTimestampThresholdFrom: filters.dateFrom,
          acquisitionTimestampThresholdTo: filters.dateTo,
        },
      },
      companyId,
      userId,
      auditAction: 'INVOICE_QUERY_METADATA',
    });

    return response.data.invoiceHeaderList ?? [];
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
        this.logger.warn(
          `Failed to download invoice ${item.ksefNumber}: ${
            error instanceof Error ? error.message : String(error)
          }`,
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
