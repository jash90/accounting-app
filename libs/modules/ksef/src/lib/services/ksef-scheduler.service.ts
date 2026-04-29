import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { IsNull, Not, Repository } from 'typeorm';

import { KsefInvoice, KsefInvoiceStatus } from '@accounting/common';

import { getKsefErrorMessage, KSEF_API_PATHS, KSEF_DEFAULTS } from '../constants';
import { KsefAuditLogService } from './ksef-audit-log.service';
import { KsefAuthService } from './ksef-auth.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KsefInvoiceService } from './ksef-invoice.service';
import { KsefSessionService } from './ksef-session.service';

interface SessionInvoiceStatusResponse {
  ordinalNumber: number;
  referenceNumber: string;
  ksefNumber?: string | null;
  acquisitionDate?: string | null;
  invoicingDate: string;
  /** Pre-signed Azure SAS URL (no Bearer token!) for the per-invoice UPO. */
  upoDownloadUrl?: string | null;
  upoDownloadUrlExpirationDate?: string | null;
  status: {
    code: number;
    description: string;
    details?: string[];
    /**
     * KSeF v2 puts duplicate-invoice cross-references here:
     *   { originalKsefNumber, originalSessionReferenceNumber }
     */
    extensions?: Record<string, unknown>;
  };
}

@Injectable()
export class KsefSchedulerService {
  private readonly logger = new Logger(KsefSchedulerService.name);
  /**
   * In-process re-entry guard for `pollPendingStatuses`. NestJS `@Cron`
   * does NOT prevent overlapping invocations by default — and since this
   * job batches up to 50 invoices per company and follows pre-signed SAS
   * URLs (each with up to `UPLOAD_TIMEOUT_MS` budget), a slow tick can
   * easily exceed 60s and let the next tick start while the previous is
   * still draining. That cascade thrashes both KSeF and our own DB.
   *
   * Note: this is a single-process guard. Multi-replica deployments
   * (Railway horizontal scaling) need a DB advisory lock instead — that
   * is intentionally out of scope here.
   */
  private isPolling = false;

  constructor(
    @InjectRepository(KsefInvoice)
    private readonly invoiceRepo: Repository<KsefInvoice>,
    private readonly httpClient: KsefHttpClientService,
    private readonly authService: KsefAuthService,
    private readonly configService: KsefConfigService,
    private readonly invoiceService: KsefInvoiceService,
    private readonly sessionService: KsefSessionService,
    private readonly auditLogService: KsefAuditLogService
  ) {}

  // Run every minute. KSeF typically finishes processing an invoice within
  // 5–30 seconds, so a 1-minute poll keeps the UI's "Wysłana → Zaakceptowana"
  // transition snappy without flooding KSeF with requests (we batch-process
  // up to 50 invoices per company per tick).
  @Cron('* * * * *', { timeZone: 'Europe/Warsaw' })
  async pollPendingStatuses(): Promise<void> {
    if (this.isPolling) {
      this.logger.warn('Skipping invoice status poll — previous tick still running');
      return;
    }
    this.isPolling = true;
    try {
      await this.runPollPendingStatuses();
    } finally {
      this.isPolling = false;
    }
  }

  private async runPollPendingStatuses(): Promise<void> {
    const pendingInvoices = await this.invoiceRepo.find({
      where: {
        status: KsefInvoiceStatus.SUBMITTED,
        ksefReferenceNumber: Not(IsNull()),
        sessionId: Not(IsNull()),
      },
      relations: ['session'],
      take: 50,
      order: { submittedAt: 'ASC' },
    });

    if (pendingInvoices.length === 0) return;

    this.logger.log(`Polling status for ${pendingInvoices.length} submitted invoices`);

    // Group by companyId for config/auth efficiency
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

        // Get a valid auth token for this company
        const userId = invoices[0].createdById;
        let token: string;
        try {
          token = await this.authService.getValidToken(companyId, userId);
        } catch {
          this.logger.warn(`Cannot authenticate for company ${companyId}, skipping status poll`);
          continue;
        }

        for (const invoice of invoices) {
          const sessionRef = invoice.session?.ksefSessionRef;
          if (!sessionRef || !invoice.ksefReferenceNumber) continue;

          try {
            // KSeF v2: GET /sessions/{sessionRef}/invoices/{invoiceRef}
            const path = KSEF_API_PATHS.SESSION_ONLINE_INVOICE_STATUS.replace(
              '{sessionRef}',
              sessionRef
            ).replace('{invoiceRef}', invoice.ksefReferenceNumber!);

            const response = await this.httpClient.request<SessionInvoiceStatusResponse>({
              environment: config.environment,
              method: 'GET',
              path,
              headers: { Authorization: `Bearer ${token}` },
              companyId,
              userId,
              auditAction: 'INVOICE_STATUS_POLL',
              auditEntityType: 'KsefInvoice',
              auditEntityId: invoice.id,
            });

            const statusCode = response.data.status?.code;
            const ksefNumber = response.data.ksefNumber;

            // 100/150 = still processing (no-op), 200 = accepted, 440 = duplicate (already
            // accepted under a different reference), other 400+ = rejected. The 440 branch
            // MUST run before the generic >= 400 fallback — otherwise a perfectly accepted
            // duplicate would be flipped to REJECTED, hiding the original ksefNumber.
            if (statusCode === 200 && ksefNumber) {
              const upoCapture = await this.captureInvoiceUpo(response.data, {
                companyId,
                userId,
                invoiceId: invoice.id,
              });
              await this.invoiceService.updateInvoiceStatus(
                invoice.id,
                KsefInvoiceStatus.ACCEPTED,
                { ksefNumber, ...upoCapture }
              );
              this.logger.log(`Invoice ${invoice.id} accepted: ${ksefNumber}`);
            } else if (statusCode === 440) {
              const extensions = (response.data.status?.extensions ?? {}) as Record<
                string,
                unknown
              >;
              const originalKsefNumber =
                typeof extensions['originalKsefNumber'] === 'string'
                  ? (extensions['originalKsefNumber'] as string)
                  : null;
              const originalSessionRef =
                typeof extensions['originalSessionReferenceNumber'] === 'string'
                  ? (extensions['originalSessionReferenceNumber'] as string)
                  : null;

              if (originalKsefNumber) {
                // KSeF: this exact invoice payload was already accepted in a prior session.
                // Treat it as ACCEPTED and link it to the canonical KSeF number — losing
                // that linkage is the bug we're fixing here.
                await this.invoiceService.updateInvoiceStatus(
                  invoice.id,
                  KsefInvoiceStatus.ACCEPTED,
                  { ksefNumber: originalKsefNumber }
                );
                this.logger.warn(
                  `Invoice ${invoice.id} reported as duplicate (440); linked to original ksefNumber=${originalKsefNumber}` +
                    (originalSessionRef ? ` (originalSession=${originalSessionRef})` : '')
                );
              } else {
                // 440 without originalKsefNumber should never happen per spec — log loudly
                // and fall back to REJECTED so the invoice doesn't get stuck SUBMITTED.
                this.logger.error(
                  `Invoice ${invoice.id} got 440 (duplicate) but no originalKsefNumber in extensions; marking as rejected. extensions=${JSON.stringify(
                    extensions
                  )}`
                );
                await this.invoiceService.updateInvoiceStatus(
                  invoice.id,
                  KsefInvoiceStatus.REJECTED,
                  {
                    validationErrors: [
                      {
                        code: 440,
                        description: getKsefErrorMessage(440, response.data.status.description),
                      },
                    ],
                  }
                );
              }
            } else if (statusCode && statusCode >= 400) {
              const details = response.data.status.details ?? [];
              const validationErrors = [
                {
                  code: statusCode,
                  description: getKsefErrorMessage(statusCode, response.data.status.description),
                },
                ...details.map((d) => ({ description: d })),
              ];
              await this.invoiceService.updateInvoiceStatus(
                invoice.id,
                KsefInvoiceStatus.REJECTED,
                { validationErrors }
              );
              this.logger.warn(
                `Invoice ${invoice.id} rejected: code ${statusCode} — ${response.data.status.description}`
              );
            }
          } catch (error) {
            this.logger.warn(
              `Failed to poll status for invoice ${invoice.id}: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to process company ${companyId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  @Cron('0 * * * *', { timeZone: 'Europe/Warsaw' })
  async expireStaleSessions(): Promise<void> {
    try {
      const count = await this.sessionService.expireStaleSessions();
      if (count > 0) {
        this.logger.log(`Expired ${count} stale sessions`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to expire stale sessions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * On a 200 response, KSeF returns a pre-signed Azure SAS URL for the per-
   * invoice UPO. Download it eagerly so users get the legally-required
   * confirmation document without another round-trip — and persist the URL
   * + expiry as a fallback in case the eager fetch failed (e.g. transient
   * network blip; the URL is valid for ~3 days, so a later retry can
   * succeed before the link expires).
   *
   * Per spec the SAS URL must be requested WITHOUT the Bearer token, so we
   * use a plain `fetch()` instead of going through `KsefHttpClientService`.
   */
  private async captureInvoiceUpo(
    data: SessionInvoiceStatusResponse,
    audit: { companyId: string; userId: string; invoiceId: string }
  ): Promise<{
    upoXml?: string | null;
    upoDownloadUrl?: string | null;
    upoDownloadUrlExpirationDate?: Date | null;
  }> {
    if (!data.upoDownloadUrl) {
      return {};
    }

    const expirationDate = data.upoDownloadUrlExpirationDate
      ? new Date(data.upoDownloadUrlExpirationDate)
      : null;

    const startedAt = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), KSEF_DEFAULTS.UPLOAD_TIMEOUT_MS);
      try {
        const response = await fetch(data.upoDownloadUrl, { signal: controller.signal });
        if (!response.ok) {
          // Audit-log the failure before throwing — the SAS-URL fetch
          // bypasses KsefHttpClientService (no Bearer token allowed) so
          // we have to log it ourselves. Polish e-invoice compliance
          // requires a demonstrable good-faith attempt trail.
          await this.auditLogService.log({
            companyId: audit.companyId,
            userId: audit.userId,
            action: 'UPO_FETCH',
            entityType: 'KsefInvoice',
            entityId: audit.invoiceId,
            httpMethod: 'GET',
            httpUrl: data.upoDownloadUrl,
            httpStatusCode: response.status,
            errorMessage: `HTTP ${response.status} ${response.statusText}`,
            durationMs: Date.now() - startedAt,
          });
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const xml = await response.text();
        await this.auditLogService.log({
          companyId: audit.companyId,
          userId: audit.userId,
          action: 'UPO_FETCH',
          entityType: 'KsefInvoice',
          entityId: audit.invoiceId,
          httpMethod: 'GET',
          httpUrl: data.upoDownloadUrl,
          httpStatusCode: response.status,
          responseSnippet: `Captured UPO XML (${xml.length} bytes)`,
          durationMs: Date.now() - startedAt,
        });
        return {
          upoXml: xml,
          upoDownloadUrl: data.upoDownloadUrl,
          upoDownloadUrlExpirationDate: expirationDate,
        };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      // Network-level failures (abort, DNS, etc.) — audit-log here too.
      // The HTTP-level failures already logged inside the try block.
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.startsWith('HTTP ')) {
        await this.auditLogService.log({
          companyId: audit.companyId,
          userId: audit.userId,
          action: 'UPO_FETCH',
          entityType: 'KsefInvoice',
          entityId: audit.invoiceId,
          httpMethod: 'GET',
          httpUrl: data.upoDownloadUrl,
          errorMessage,
          durationMs: Date.now() - startedAt,
        });
      }
      this.logger.warn(
        `Failed to download per-invoice UPO from SAS URL: ${
          error instanceof Error ? error.message : String(error)
        }. URL + expiry persisted so the UI can offer a fallback download button.`
      );
      return {
        upoXml: null,
        upoDownloadUrl: data.upoDownloadUrl,
        upoDownloadUrlExpirationDate: expirationDate,
      };
    }
  }
}
