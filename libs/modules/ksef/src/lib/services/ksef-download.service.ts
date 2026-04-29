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
import { KsefSyncDirection, KsefSyncResultDto } from '../dto';
import type { KsefInvoiceMetadata, KsefQueryInvoicesResponse } from '../generated';
import { KsefAuditLogService } from './ksef-audit-log.service';
import { KsefAuthService } from './ksef-auth.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KsefXmlService } from './ksef-xml.service';

@Injectable()
export class KsefDownloadService {
  private readonly logger = new Logger(KsefDownloadService.name);

  constructor(
    @InjectRepository(KsefInvoice)
    private readonly invoiceRepo: Repository<KsefInvoice>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    private readonly httpClient: KsefHttpClientService,
    private readonly authService: KsefAuthService,
    private readonly configService: KsefConfigService,
    private readonly cryptoService: KsefCryptoService,
    private readonly auditLogService: KsefAuditLogService,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly xmlService: KsefXmlService,
  ) {}

  async downloadSingle(
    ksefNumber: string,
    companyId: string,
    userId: string,
    /**
     * Direction the caller wants to register. When omitted, the method
     * auto-detects: an invoice whose seller NIP matches the company's
     * configured NIP is OUTGOING; otherwise INCOMING. Sync passes the
     * direction explicitly because it knows which Subject1/Subject2 query
     * the metadata came from; the bare-fetch endpoint can rely on the
     * fallback (it's a low-volume admin tool).
     */
    direction?: KsefInvoiceDirection,
  ): Promise<KsefInvoice> {
    const config = await this.configService.getConfigOrFail(companyId);
    const token = await this.authService.getValidToken(companyId, userId);

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
      headers: { Authorization: `Bearer ${token}` },
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
    const parsedInvoice = this.xmlService.parseInvoiceXml(invoiceXml);

    // Auto-detect direction when the caller didn't pass one.
    const resolvedDirection =
      direction ??
      (config.nip && parsedInvoice.sellerNip === config.nip
        ? KsefInvoiceDirection.OUTGOING
        : KsefInvoiceDirection.INCOMING);

    // Check if invoice already exists by ksefNumber (canonical KSeF id).
    const existing = await this.invoiceRepo.findOne({
      where: { ksefNumber, companyId },
    });

    if (existing) {
      existing.xmlContent = invoiceXml;
      existing.rawKsefResponse = { invoiceXml, ksefNumber } as unknown as Record<string, unknown>;
      return this.invoiceRepo.save(existing);
    }

    // Reconcile by (companyId, invoiceNumber): KSeF is the source of truth.
    //
    // Why this matters: if a user issued an invoice locally and we recorded
    // it with status REJECTED (e.g. an early submission attempt failed
    // before status reconciliation, or an offline edit went stale), KSeF
    // may STILL have it on file as accepted under its canonical
    // ksefNumber. Without this branch, sync hits the unique constraint
    // `(companyId, invoiceNumber)` on every retry and the rejected row
    // sticks forever. Adopt the KSeF state — clear stale REJECTED/ERROR
    // flags, attach the canonical ksefNumber, and store the authoritative
    // XML.
    if (parsedInvoice.invoiceNumber) {
      const existingByNumber = await this.invoiceRepo.findOne({
        where: { invoiceNumber: parsedInvoice.invoiceNumber, companyId },
      });
      if (existingByNumber) {
        existingByNumber.ksefNumber = ksefNumber;
        existingByNumber.status = KsefInvoiceStatus.ACCEPTED;
        existingByNumber.xmlContent = invoiceXml;
        existingByNumber.xmlHash = this.cryptoService.computeSha256(invoiceXml);
        existingByNumber.rawKsefResponse = { invoiceXml, ksefNumber } as unknown as Record<string, unknown>;
        existingByNumber.acceptedAt = existingByNumber.acceptedAt ?? new Date();
        // Wipe stale local-only state — KSeF accepted this invoice, so
        // rejection / validation errors are no longer accurate.
        existingByNumber.rejectedAt = null;
        existingByNumber.validationErrors = null;
        // Direction in DB may have been UNKNOWN or wrong; re-stamp from
        // the data we just resolved.
        existingByNumber.direction = direction ?? existingByNumber.direction;

        const saved = await this.invoiceRepo.save(existingByNumber);

        await this.auditLogService.log({
          companyId,
          userId,
          action: 'INVOICE_RECONCILED',
          entityType: 'KsefInvoice',
          entityId: saved.id,
          responseSnippet: `Adopted KSeF state for ${parsedInvoice.invoiceNumber} → ${ksefNumber} (was ${existingByNumber.status})`,
        });

        return saved;
      }
    }

    // Match the counterparty to a client by NIP. The counterparty depends
    // on direction: for incoming purchases that's the seller; for outgoing
    // sales that's the buyer.
    const counterpartyNip =
      resolvedDirection === KsefInvoiceDirection.OUTGOING
        ? parsedInvoice.buyerNip
        : parsedInvoice.sellerNip;
    const client = counterpartyNip
      ? await this.matchClientByNip(companyId, counterpartyNip)
      : null;

    const invoice = this.invoiceRepo.create({
      companyId,
      clientId: client?.id ?? null,
      invoiceType:
        resolvedDirection === KsefInvoiceDirection.OUTGOING
          ? KsefInvoiceType.SALES
          : KsefInvoiceType.PURCHASE,
      direction: resolvedDirection,
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
    const token = await this.authService.getValidToken(companyId, userId);
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
        headers: { Authorization: `Bearer ${token}` },
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

  /**
   * Sync invoices from KSeF for the given direction.
   *
   * - `incoming` queries `Subject2` (we are the buyer) — purchase invoices
   *   issued by counterparties.
   * - `outgoing` queries `Subject1` (we are the seller) — our own sales,
   *   useful for reconciliation when invoices were issued from a different
   *   system on the same NIP.
   * - `both` runs both queries and dedupes by KSeF number — the result
   *   counts an invoice once even if it would otherwise show up in both.
   *
   * Each downloaded invoice is persisted via `downloadSingle` with the
   * matching direction so the local row's `direction` / `invoiceType` /
   * counterparty `clientId` are set correctly.
   */
  async syncByDirection(
    companyId: string,
    userId: string,
    dateFrom: string,
    dateTo: string,
    direction: KsefSyncDirection,
  ): Promise<KsefSyncResultDto> {
    const lookups: Array<{ subjectType: 'Subject1' | 'Subject2'; invoiceDirection: KsefInvoiceDirection }> = [];
    if (direction === KsefSyncDirection.INCOMING || direction === KsefSyncDirection.BOTH) {
      lookups.push({ subjectType: 'Subject2', invoiceDirection: KsefInvoiceDirection.INCOMING });
    }
    if (direction === KsefSyncDirection.OUTGOING || direction === KsefSyncDirection.BOTH) {
      lookups.push({ subjectType: 'Subject1', invoiceDirection: KsefInvoiceDirection.OUTGOING });
    }

    // Aggregate all metadata across the requested directions, deduping by
    // ksefNumber (a single invoice cannot legitimately appear in both
    // Subject1 and Subject2 for the same NIP, but defend against the
    // pathological case anyway).
    const seen = new Set<string>();
    const items: Array<{ ksefNumber: string; direction: KsefInvoiceDirection }> = [];
    for (const { subjectType, invoiceDirection } of lookups) {
      const metadata = await this.queryInvoiceMetadata(
        { dateFrom, dateTo, subjectType },
        companyId,
        userId,
      );
      for (const m of metadata) {
        if (seen.has(m.ksefNumber)) continue;
        seen.add(m.ksefNumber);
        items.push({ ksefNumber: m.ksefNumber, direction: invoiceDirection });
      }
    }

    let newInvoices = 0;
    let updatedInvoices = 0;
    let errors = 0;
    const failedInvoices: Array<{ ksefNumber: string; error: string }> = [];

    for (const item of items) {
      try {
        const existing = await this.invoiceRepo.findOne({
          where: { ksefNumber: item.ksefNumber, companyId },
        });

        if (existing) {
          updatedInvoices++;
          continue;
        }

        await this.downloadSingle(item.ksefNumber, companyId, userId, item.direction);
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
        direction,
        totalFound: items.length,
        newInvoices,
        updatedInvoices,
        errors,
      }),
    });

    const result = new KsefSyncResultDto();
    result.totalFound = items.length;
    result.newInvoices = newInvoices;
    result.updatedInvoices = updatedInvoices;
    result.errors = errors;
    result.syncedAt = new Date().toISOString();
    result.failedInvoices = failedInvoices.length > 0 ? failedInvoices : undefined;
    return result;
  }

  /**
   * @deprecated Use `syncByDirection(companyId, userId, dateFrom, dateTo, KsefSyncDirection.INCOMING)`.
   * Kept as a thin wrapper for backward compatibility with internal callers.
   */
  async syncIncoming(
    companyId: string,
    userId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<KsefSyncResultDto> {
    return this.syncByDirection(companyId, userId, dateFrom, dateTo, KsefSyncDirection.INCOMING);
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
