import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';

import {
  KsefSession,
  KsefSessionStatus,
  KsefSessionType,
  PaginatedResponseDto,
} from '@accounting/common';
import { calculatePagination, SystemCompanyService } from '@accounting/common/backend';

import { KSEF_API_PATHS, KSEF_DEFAULTS, KSEF_MESSAGES } from '../constants';
import { KsefSessionResponseDto, KsefSessionStatusDto } from '../dto';
import {
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
  sessionToken: string;
  expiresAt?: string;
}

interface SessionStatusResponse {
  processingCode: number;
  processingDescription: string;
  numberOfInvoices?: number;
  upo?: string;
}

interface SessionCloseResponse {
  upoReference?: string;
}

@Injectable()
export class KsefSessionService {
  private readonly logger = new Logger(KsefSessionService.name);

  constructor(
    @InjectRepository(KsefSession)
    private readonly sessionRepo: Repository<KsefSession>,
    private readonly httpClient: KsefHttpClientService,
    private readonly authService: KsefAuthService,
    private readonly cryptoService: KsefCryptoService,
    private readonly configService: KsefConfigService,
    private readonly auditLogService: KsefAuditLogService,
    private readonly systemCompanyService: SystemCompanyService,
  ) {}

  async openInteractiveSession(
    companyId: string,
    userId: string,
  ): Promise<KsefSession> {
    const config = await this.configService.getConfigOrFail(companyId);

    // Authenticate first
    const authResult = await this.authService.authenticate(companyId, userId);

    // Generate AES key for session encryption
    const { key, iv } = this.cryptoService.generateAesKey();
    const wrappedKey = await this.cryptoService.wrapAesKey(
      key,
      config.environment,
      companyId,
      userId,
    );

    // Open interactive session
    const response = await this.httpClient.request<SessionOpenResponse>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.SESSION_ONLINE_OPEN,
      data: {
        context: {
          identifier: {
            type: 'onip',
            identifier: config.nip,
          },
        },
        encryptionKey: {
          type: 'AES',
          encryptedSymmetricKey: wrappedKey.toString('base64'),
          initializationVector: iv.toString('base64'),
        },
      },
      headers: {
        Authorization: `Bearer ${authResult}`,
      },
      companyId,
      userId,
      auditAction: 'SESSION_OPEN',
      auditEntityType: 'KsefSession',
    });

    const now = new Date();
    const expiresAt = response.data.expiresAt
      ? new Date(response.data.expiresAt)
      : new Date(now.getTime() + KSEF_DEFAULTS.SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    const session = this.sessionRepo.create({
      companyId,
      sessionType: KsefSessionType.INTERACTIVE,
      ksefSessionRef: response.data.referenceNumber,
      status: KsefSessionStatus.ACTIVE,
      startedAt: now,
      expiresAt,
      invoiceCount: 0,
      createdById: userId,
      metadata: {
        accessToken: authResult,
        aesKey: key.toString('base64'),
        aesIv: iv.toString('base64'),
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
    const active = await this.getActiveSession(companyId);
    if (active) {
      return active;
    }
    return this.openInteractiveSession(companyId, userId);
  }

  async sendInvoiceInSession(
    session: KsefSession,
    encryptedContentBase64: string,
    companyId: string,
    userId: string,
  ): Promise<{ ksefReferenceNumber: string }> {
    if (session.status !== KsefSessionStatus.ACTIVE) {
      throw new KsefSessionExpiredException(session.id);
    }

    const config = await this.configService.getConfigOrFail(companyId);
    const sessionToken = (session.metadata as Record<string, unknown>)?.['sessionToken'] as string;

    const path = KSEF_API_PATHS.SESSION_ONLINE_INVOICES.replace(
      '{ref}',
      session.ksefSessionRef!,
    );

    const response = await this.httpClient.request<{ elementReferenceNumber: string }>({
      environment: config.environment,
      method: 'POST',
      path,
      data: {
        invoiceBody: encryptedContentBase64,
      },
      headers: {
        SessionToken: sessionToken,
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

    return { ksefReferenceNumber: response.data.elementReferenceNumber };
  }

  async closeSession(
    sessionId: string,
    userId: string,
  ): Promise<KsefSession> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new KsefSessionNotFoundException(sessionId);
    }

    if (session.status === KsefSessionStatus.CLOSED) {
      return session;
    }

    const config = await this.configService.getConfigOrFail(session.companyId);
    const sessionToken = (session.metadata as Record<string, unknown>)?.['sessionToken'] as string;

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
          SessionToken: sessionToken,
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
      session.metadata = {
        ...((session.metadata as Record<string, unknown>) ?? {}),
        sessionToken: undefined,
        aesKey: undefined,
        aesIv: undefined,
      };

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
      where: { id: sessionId },
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

      // Update UPO if available
      if (response.data.upo) {
        session.upoContent = response.data.upo;
        session.upoReference = session.upoReference ?? session.ksefSessionRef;
        await this.sessionRepo.save(session);
      }

      const dto = this.toStatusDto(session);
      dto.processedCount = response.data.numberOfInvoices ?? 0;
      dto.upoAvailable = !!response.data.upo;
      return dto;
    } catch {
      return this.toStatusDto(session);
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
      session.status = KsefSessionStatus.CLOSED;
      session.closedAt = now;
      session.errorMessage = KSEF_MESSAGES.SESSION_EXPIRED;

      // Clear sensitive data
      session.metadata = {
        ...((session.metadata as Record<string, unknown>) ?? {}),
        sessionToken: undefined,
        aesKey: undefined,
        aesIv: undefined,
      };
    }

    await this.sessionRepo.save(staleSessions);
    this.logger.warn(`Expired ${staleSessions.length} stale sessions`);
    return staleSessions.length;
  }

  async getUpoContent(sessionId: string): Promise<string | null> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new KsefSessionNotFoundException(sessionId);
    }

    return session.upoContent ?? null;
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
