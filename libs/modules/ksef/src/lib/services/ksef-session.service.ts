import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';

import {
  KsefEnvironment,
  KsefSession,
  KsefSessionStatus,
  KsefSessionType,
  PaginatedResponseDto,
} from '@accounting/common';
import { calculatePagination, EncryptionService, SystemCompanyService } from '@accounting/common/backend';

import { KSEF_API_PATHS, KSEF_DEFAULTS, KSEF_MESSAGES } from '../constants';
import { KsefSessionResponseDto, KsefSessionStatusDto } from '../dto';
import {
  KsefApiException,
  KsefSessionExpiredException,
  KsefSessionNotFoundException,
} from '../exceptions';
import { KsefAuditLogService } from './ksef-audit-log.service';
import { KsefAuthService } from './ksef-auth.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefHttpClientService } from './ksef-http-client.service';

interface SessionOpenResponse {
  referenceNumber: string;
  validUntil?: string;
}

interface SessionUpoPageResponse {
  referenceNumber: string;
  downloadUrl: string;
  /** ISO-8601 timestamp; the SAS URL stops working after this date. */
  downloadUrlExpirationDate: string;
}

interface SessionUpoResponse {
  pages: SessionUpoPageResponse[];
}

/**
 * Shape of `GET /sessions/{ref}` per KSeF v2 OpenAPI spec.
 *
 * Important: `upo` is an OBJECT containing pre-signed Azure SAS URLs, NOT
 * the inline UPO XML. The previous implementation assumed `upo` was a
 * string and stored `[object Object]` into `KsefSession.upoContent`. We now
 * follow the SAS URL and persist the actual XML body.
 *
 * `processingCode` / `processingDescription` are kept on the type as
 * optionals because some legacy responses use them; new responses use the
 * structured `status` object — both are read by the service so either works.
 */
interface SessionStatusResponse {
  processingCode?: number;
  processingDescription?: string;
  status?: {
    code: number;
    description: string;
  };
  numberOfInvoices?: number;
  invoiceCount?: number | null;
  successfulInvoiceCount?: number | null;
  failedInvoiceCount?: number | null;
  upo?: SessionUpoResponse | null;
}

interface SessionCloseResponse {
  upoReference?: string;
}

@Injectable()
export class KsefSessionService {
  private readonly logger = new Logger(KsefSessionService.name);
  private readonly sessionCreationLocks = new Map<string, Promise<KsefSession>>();

  constructor(
    @InjectRepository(KsefSession)
    private readonly sessionRepo: Repository<KsefSession>,
    private readonly httpClient: KsefHttpClientService,
    private readonly authService: KsefAuthService,
    private readonly cryptoService: KsefCryptoService,
    private readonly configService: KsefConfigService,
    private readonly auditLogService: KsefAuditLogService,
    private readonly systemCompanyService: SystemCompanyService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async openInteractiveSession(
    companyId: string,
    userId: string,
  ): Promise<KsefSession> {
    const config = await this.configService.getConfigOrFail(companyId);

    // Authenticate first
    const authResult = await this.authService.authenticate(companyId, userId);

    // Wrap the AES key with the MoF public cert and POST /sessions/online.
    // If the wrap+open fails (e.g. KSeF rejected the wrapped key because our
    // cached cert was stale after an emergency rotation), retry once with a
    // forced public-key refresh — same recovery strategy as the auth flow.
    let openResult: { data: SessionOpenResponse; key: Buffer; iv: Buffer };
    try {
      openResult = await this.wrapAndOpenSession(
        config.environment,
        companyId,
        userId,
        authResult,
        false,
      );
    } catch (error) {
      if (!(error instanceof KsefApiException)) throw error;
      this.logger.warn(
        `Session open failed (${(error as Error).message}); retrying once with a forced public-key refresh`,
      );
      openResult = await this.wrapAndOpenSession(
        config.environment,
        companyId,
        userId,
        authResult,
        true,
      );
    }
    const { data: openData, key, iv } = openResult;

    const now = new Date();
    const expiresAt = openData.validUntil
      ? new Date(openData.validUntil)
      : new Date(now.getTime() + KSEF_DEFAULTS.SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    const session = this.sessionRepo.create({
      companyId,
      sessionType: KsefSessionType.INTERACTIVE,
      ksefSessionRef: openData.referenceNumber,
      status: KsefSessionStatus.ACTIVE,
      startedAt: now,
      expiresAt,
      invoiceCount: 0,
      createdById: userId,
      metadata: {
        accessToken: await this.encryptionService.encrypt(authResult),
        aesKey: await this.encryptionService.encrypt(key.toString('base64')),
        aesIv: await this.encryptionService.encrypt(iv.toString('base64')),
      },
    });

    const saved = await this.sessionRepo.save(session);

    await this.auditLogService.log({
      companyId,
      userId,
      action: 'SESSION_OPENED',
      entityType: 'KsefSession',
      entityId: saved.id,
    });

    this.logger.log(
      `Interactive session opened for company ${companyId}: ${saved.id}`,
    );

    return saved;
  }

  async getActiveSession(companyId: string): Promise<KsefSession | null> {
    return this.sessionRepo.findOne({
      where: {
        companyId,
        status: KsefSessionStatus.ACTIVE,
        expiresAt: MoreThan(new Date()),
      },
      order: { startedAt: 'DESC' },
    });
  }

  async getOrCreateSession(
    companyId: string,
    userId: string,
  ): Promise<KsefSession> {
    // Check for existing active session first (no lock needed for reads)
    const active = await this.getActiveSession(companyId);
    if (active) {
      return active;
    }

    // Use mutex to prevent duplicate session creation
    const existingLock = this.sessionCreationLocks.get(companyId);
    if (existingLock) {
      return existingLock;
    }

    const creationPromise = this.openInteractiveSession(companyId, userId)
      .finally(() => {
        this.sessionCreationLocks.delete(companyId);
      });

    this.sessionCreationLocks.set(companyId, creationPromise);
    return creationPromise;
  }

  async sendInvoiceInSession(
    session: KsefSession,
    xmlContent: string,
    companyId: string,
    userId: string,
  ): Promise<{ ksefReferenceNumber: string }> {
    if (session.status !== KsefSessionStatus.ACTIVE) {
      throw new KsefSessionExpiredException(session.id);
    }

    const config = await this.configService.getConfigOrFail(companyId);
    const sessionToken = await this.getEncryptedSessionToken(session);

    // Encrypt invoice XML using session's AES key (registered during session open)
    const metadata = session.metadata as Record<string, unknown>;
    const aesKeyB64 = await this.encryptionService.decrypt(metadata['aesKey'] as string);
    const aesIvB64 = await this.encryptionService.decrypt(metadata['aesIv'] as string);
    const aesKey = Buffer.from(aesKeyB64, 'base64');
    const aesIv = Buffer.from(aesIvB64, 'base64');

    const xmlBuffer = Buffer.from(xmlContent, 'utf-8');
    const encrypted = this.cryptoService.encryptWithAes(xmlBuffer, aesKey, aesIv);

    const originalHash = this.cryptoService.computeSha256Base64(xmlBuffer);
    const encryptedHash = this.cryptoService.computeSha256Base64(encrypted);

    const path = KSEF_API_PATHS.SESSION_ONLINE_INVOICES.replace(
      '{ref}',
      session.ksefSessionRef!,
    );

    const response = await this.httpClient.request<{ referenceNumber: string }>({
      environment: config.environment,
      method: 'POST',
      path,
      data: {
        invoiceHash: originalHash,
        invoiceSize: xmlBuffer.length,
        encryptedInvoiceHash: encryptedHash,
        encryptedInvoiceSize: encrypted.length,
        encryptedInvoiceContent: encrypted.toString('base64'),
      },
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
      companyId,
      userId,
      auditAction: 'INVOICE_SEND',
      auditEntityType: 'KsefSession',
      auditEntityId: session.id,
    });

    // Increment invoice count
    session.invoiceCount += 1;
    await this.sessionRepo.save(session);

    return { ksefReferenceNumber: response.data.referenceNumber };
  }

  async closeSession(
    sessionId: string,
    companyId: string,
    userId: string,
  ): Promise<KsefSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new KsefSessionNotFoundException(sessionId);
    }

    if (session.status === KsefSessionStatus.CLOSED) {
      return session;
    }

    const config = await this.configService.getConfigOrFail(session.companyId);
    const sessionToken = await this.getEncryptedSessionToken(session);

    session.status = KsefSessionStatus.CLOSING;
    await this.sessionRepo.save(session);

    try {
      const path = KSEF_API_PATHS.SESSION_ONLINE_CLOSE.replace(
        '{ref}',
        session.ksefSessionRef!,
      );

      const response = await this.httpClient.request<SessionCloseResponse>({
        environment: config.environment,
        method: 'POST',
        path,
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        companyId: session.companyId,
        userId,
        auditAction: 'SESSION_CLOSE',
        auditEntityType: 'KsefSession',
        auditEntityId: session.id,
      });

      session.status = KsefSessionStatus.CLOSED;
      session.closedAt = new Date();
      session.upoReference = response.data.upoReference ?? null;

      // Clear sensitive data from metadata
      const { accessToken, aesKey, aesIv, ...safeMetadata } =
        (session.metadata as Record<string, unknown>) ?? {};
      session.metadata = Object.keys(safeMetadata).length > 0 ? safeMetadata : null;

      const saved = await this.sessionRepo.save(session);

      await this.auditLogService.log({
        companyId: session.companyId,
        userId,
        action: 'SESSION_CLOSED',
        entityType: 'KsefSession',
        entityId: session.id,
      });

      this.logger.log(`Session ${sessionId} closed`);
      return saved;
    } catch (error) {
      session.status = KsefSessionStatus.ERROR;
      session.errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.sessionRepo.save(session);
      throw error;
    }
  }

  async getSessionStatus(
    sessionId: string,
    companyId: string,
    userId: string,
  ): Promise<KsefSessionStatusDto> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new KsefSessionNotFoundException(sessionId);
    }

    // If session is already closed, return local data
    if (
      session.status === KsefSessionStatus.CLOSED ||
      session.status === KsefSessionStatus.ERROR
    ) {
      return this.toStatusDto(session);
    }

    // Poll KSeF for live status
    const config = await this.configService.getConfigOrFail(session.companyId);
    const path = KSEF_API_PATHS.SESSION_ONLINE_STATUS.replace(
      '{ref}',
      session.ksefSessionRef!,
    );

    try {
      const response = await this.httpClient.request<SessionStatusResponse>({
        environment: config.environment,
        method: 'GET',
        path,
        companyId,
        userId,
        auditAction: 'SESSION_STATUS_CHECK',
        auditEntityType: 'KsefSession',
        auditEntityId: session.id,
      });

      const upoCaptured = await this.persistSessionUpoIfReady(session, response.data.upo);

      const dto = this.toStatusDto(session);
      dto.processedCount =
        response.data.numberOfInvoices ?? response.data.successfulInvoiceCount ?? 0;
      dto.upoAvailable = upoCaptured || !!session.upoContent;
      return dto;
    } catch {
      return this.toStatusDto(session);
    }
  }

  /**
   * Pulls the UPO XML body when KSeF reports it ready.
   *
   * KSeF v2 returns UPO as a structured object with one or more pages, each
   * carrying a pre-signed Azure SAS download URL (no Authorization header
   * required, link expires after `downloadUrlExpirationDate`). We fetch the
   * URL, persist the XML into `upoContent`, the page reference into
   * `upoReference`, and stash the expiration in `metadata.upoExpiresAt` so
   * the UI can warn the operator if the link is about to expire.
   *
   * Returns true when we successfully captured a UPO (or already had one).
   * On a transient fetch failure the page metadata is still persisted so a
   * subsequent poll can retry while the SAS link is still valid.
   */
  private async persistSessionUpoIfReady(
    session: KsefSession,
    upo: SessionUpoResponse | null | undefined,
  ): Promise<boolean> {
    if (!upo?.pages?.length) {
      return false;
    }

    // Already captured for this session — don't re-fetch.
    if (session.upoContent) {
      return true;
    }

    const page = upo.pages[0];
    if (!page?.downloadUrl) {
      return false;
    }

    const metadata = (session.metadata as Record<string, unknown> | null) ?? {};
    metadata['upoDownloadUrl'] = page.downloadUrl;
    metadata['upoDownloadUrlExpirationDate'] = page.downloadUrlExpirationDate;

    let captured = false;
    const startedAt = Date.now();
    try {
      const xml = await this.fetchUpoXml(page.downloadUrl);
      session.upoContent = xml;
      session.upoReference = page.referenceNumber ?? session.upoReference ?? null;
      captured = true;
      // Audit-log the successful UPO capture. SAS URL fetches bypass
      // KsefHttpClientService (no Bearer header allowed), so we have
      // to log them here for compliance traceability.
      await this.auditLogService.log({
        companyId: session.companyId,
        userId: session.createdById,
        action: 'UPO_FETCH',
        entityType: 'KsefSession',
        entityId: session.id,
        httpMethod: 'GET',
        httpUrl: page.downloadUrl,
        httpStatusCode: 200,
        responseSnippet: `Captured session UPO XML (${xml.length} bytes)`,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to download session UPO XML from SAS URL for session ${session.id}: ${errorMessage}. URL + expiry stashed in metadata for a later retry.`,
      );
      await this.auditLogService.log({
        companyId: session.companyId,
        userId: session.createdById,
        action: 'UPO_FETCH',
        entityType: 'KsefSession',
        entityId: session.id,
        httpMethod: 'GET',
        httpUrl: page.downloadUrl,
        errorMessage,
        durationMs: Date.now() - startedAt,
      });
    }

    session.metadata = metadata;
    await this.sessionRepo.save(session);
    return captured;
  }

  /**
   * Fetch a UPO XML body from a KSeF-issued Azure SAS URL.
   *
   * Per KSeF v2 spec: the link is unauthenticated — DO NOT send an
   * Authorization header. Treat any non-2xx response as a fetch failure;
   * the caller will decide whether to keep the URL for a later retry.
   *
   * Wrapped in a tiny abort timeout so we don't block the status-check
   * endpoint indefinitely on a hung Azure tenant.
   */
  private async fetchUpoXml(downloadUrl: string): Promise<string> {
    const controller = new AbortController();
    const timeoutMs = KSEF_DEFAULTS.UPLOAD_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(downloadUrl, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  async findAll(
    companyId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResponseDto<KsefSessionResponseDto>> {
    const { page: p, limit: l, skip } = calculatePagination({ page, limit });

    const [data, total] = await this.sessionRepo.findAndCount({
      where: { companyId },
      order: { startedAt: 'DESC' },
      skip,
      take: l,
    });

    return new PaginatedResponseDto(
      data.map((s) => this.toResponseDto(s)),
      total,
      p,
      l,
    );
  }

  async expireStaleSessions(): Promise<number> {
    const now = new Date();

    const staleSessions = await this.sessionRepo.find({
      where: {
        status: KsefSessionStatus.ACTIVE,
        expiresAt: LessThanOrEqual(now),
      },
    });

    if (staleSessions.length === 0) return 0;

    for (const session of staleSessions) {
      // Best-effort close on KSeF side
      if (session.ksefSessionRef) {
        try {
          const config = await this.configService.getConfig(session.companyId);
          if (config) {
            const path = KSEF_API_PATHS.SESSION_ONLINE_CLOSE.replace(
              '{ref}',
              session.ksefSessionRef,
            );
            // Try to get cached token, skip if unavailable
            const metadata = session.metadata as Record<string, unknown> | null;
            const encryptedToken = metadata?.['accessToken'] as string | undefined;
            if (encryptedToken) {
              try {
                const token = await this.encryptionService.decrypt(encryptedToken);
                await this.httpClient.request({
                  environment: config.environment,
                  method: 'POST',
                  path,
                  headers: { Authorization: `Bearer ${token}` },
                  companyId: session.companyId,
                  userId: session.createdById,
                  auditAction: 'SESSION_EXPIRE_CLOSE',
                  auditEntityType: 'KsefSession',
                  auditEntityId: session.id,
                });
              } catch {
                // Token may be expired — that's OK for cleanup
              }
            }
          }
        } catch {
          this.logger.debug(`Could not close stale session ${session.id} on KSeF`);
        }
      }

      session.status = KsefSessionStatus.CLOSED;
      session.closedAt = now;
      session.errorMessage = KSEF_MESSAGES.SESSION_EXPIRED;

      // Clear sensitive data
      const { accessToken: _at, aesKey: _ak, aesIv: _ai, ...safeMeta } =
        (session.metadata as Record<string, unknown>) ?? {};
      session.metadata = Object.keys(safeMeta).length > 0 ? safeMeta : null;
    }

    await this.sessionRepo.save(staleSessions);
    this.logger.warn(`Expired ${staleSessions.length} stale sessions`);
    return staleSessions.length;
  }

  async getUpoContent(sessionId: string, companyId: string): Promise<string | null> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, companyId },
    });

    if (!session) {
      throw new KsefSessionNotFoundException(sessionId);
    }

    return session.upoContent ?? null;
  }

  /**
   * Encrypts a fresh AES key with the MoF public cert and opens an online
   * session. Extracted so the caller can retry with `forceRefresh: true` if
   * the first attempt fails because of a stale cached public key.
   */
  private async wrapAndOpenSession(
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
    accessToken: string,
    forceRefresh: boolean,
  ): Promise<{ data: SessionOpenResponse; key: Buffer; iv: Buffer }> {
    const { key, iv } = this.cryptoService.generateAesKey();
    const wrappedKey = await this.cryptoService.wrapAesKey(
      key,
      environment,
      companyId,
      userId,
      forceRefresh,
    );

    const response = await this.httpClient.request<SessionOpenResponse>({
      environment,
      method: 'POST',
      path: KSEF_API_PATHS.SESSION_ONLINE_OPEN,
      data: {
        formCode: {
          systemCode: 'FA (3)',
          schemaVersion: '1-0E',
          value: 'FA',
        },
        encryption: {
          encryptedSymmetricKey: wrappedKey.toString('base64'),
          initializationVector: iv.toString('base64'),
        },
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      companyId,
      userId,
      auditAction: 'SESSION_OPEN',
      auditEntityType: 'KsefSession',
    });

    return { data: response.data, key, iv };
  }

  private async getEncryptedSessionToken(session: KsefSession): Promise<string> {
    const encrypted = (session.metadata as Record<string, unknown>)?.['accessToken'] as string;
    if (!encrypted) {
      throw new KsefSessionExpiredException(session.id);
    }
    return this.encryptionService.decrypt(encrypted);
  }

  private toResponseDto(session: KsefSession): KsefSessionResponseDto {
    const dto = new KsefSessionResponseDto();
    dto.id = session.id;
    dto.companyId = session.companyId;
    dto.sessionType = session.sessionType;
    dto.ksefSessionRef = session.ksefSessionRef ?? null;
    dto.status = session.status;
    dto.startedAt = session.startedAt.toISOString();
    dto.expiresAt = session.expiresAt?.toISOString() ?? null;
    dto.closedAt = session.closedAt?.toISOString() ?? null;
    dto.invoiceCount = session.invoiceCount;
    dto.upoReference = session.upoReference ?? null;
    dto.errorMessage = session.errorMessage ?? null;
    dto.createdAt = session.createdAt.toISOString();
    return dto;
  }

  private toStatusDto(session: KsefSession): KsefSessionStatusDto {
    const dto = new KsefSessionStatusDto();
    dto.id = session.id;
    dto.status = session.status;
    dto.invoiceCount = session.invoiceCount;
    dto.upoAvailable = !!session.upoContent || !!session.upoReference;
    return dto;
  }
}
