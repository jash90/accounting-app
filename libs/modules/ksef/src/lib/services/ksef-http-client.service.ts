import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import * as https from 'https';
import { firstValueFrom } from 'rxjs';

import { KsefAuthMethod, KsefConfiguration, KsefEnvironment } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';

import { getKsefErrorMessage, KSEF_BASE_URLS, KSEF_DEFAULTS } from '../constants';
import { KsefApiException, KsefRateLimitException } from '../exceptions';
import { KsefAuditLogService } from './ksef-audit-log.service';

export interface KsefRequestOptions {
  environment: KsefEnvironment;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  data?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
  companyId: string;
  userId: string;
  auditAction: string;
  auditEntityType?: string;
  auditEntityId?: string;
  /** Set to 'text' for XML responses (e.g., invoice download) */
  responseType?: 'json' | 'text';
}

export interface KsefResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

@Injectable()
export class KsefHttpClientService {
  private readonly logger = new Logger(KsefHttpClientService.name);
  private readonly agentCache = new Map<string, https.Agent>();

  constructor(
    private readonly httpService: HttpService,
    private readonly auditLogService: KsefAuditLogService,
    @InjectRepository(KsefConfiguration)
    private readonly configRepo: Repository<KsefConfiguration>,
    private readonly encryptionService: EncryptionService,
  ) {}

  getBaseUrl(environment: KsefEnvironment): string {
    return KSEF_BASE_URLS[environment];
  }

  async request<T = unknown>(options: KsefRequestOptions): Promise<KsefResponse<T>> {
    const baseUrl = this.getBaseUrl(options.environment);
    const url = `${baseUrl}${options.path}`;
    const startTime = Date.now();

    const httpsAgent = await this.getHttpsAgent(options.companyId);

    const config: AxiosRequestConfig = {
      method: options.method,
      url,
      data: options.data,
      headers: {
        'Content-Type': 'application/json',
        Accept: options.responseType === 'text' ? 'application/xml, application/json' : 'application/json',
        ...options.headers,
      },
      responseType: options.responseType ?? 'json',
      timeout: options.timeout ?? KSEF_DEFAULTS.REQUEST_TIMEOUT_MS,
      ...(httpsAgent ? { httpsAgent } : {}),
    };

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= KSEF_DEFAULTS.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = KSEF_DEFAULTS.RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await this.sleep(delay);
          this.logger.warn(`Retry attempt ${attempt} for ${options.method} ${options.path}`);
        }

        const response: AxiosResponse<T> = await firstValueFrom(
          this.httpService.request<T>(config),
        );

        const durationMs = Date.now() - startTime;

        await this.auditLogService.log({
          companyId: options.companyId,
          userId: options.userId,
          action: options.auditAction,
          entityType: options.auditEntityType,
          entityId: options.auditEntityId,
          httpMethod: options.method,
          httpUrl: options.path,
          httpStatusCode: response.status,
          responseSnippet: this.truncateResponse(response.data),
          durationMs,
        });

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
        };
      } catch (error: unknown) {
        lastError = error as Error;
        const durationMs = Date.now() - startTime;
        const axiosError = error as { response?: AxiosResponse; message?: string };

        // Handle rate limiting
        if (axiosError.response?.status === 429) {
          const retryAfter = parseInt(
            axiosError.response.headers?.['retry-after'] ?? '5',
            10,
          );

          await this.auditLogService.log({
            companyId: options.companyId,
            userId: options.userId,
            action: options.auditAction,
            httpMethod: options.method,
            httpUrl: options.path,
            httpStatusCode: 429,
            errorMessage: `Rate limited, retry after ${retryAfter}s`,
            durationMs,
          });

          if (attempt < KSEF_DEFAULTS.MAX_RETRIES) {
            await this.sleep(retryAfter * 1000);
            continue;
          }

          throw new KsefRateLimitException();
        }

        // Retry on 502, 503, 504
        const status = axiosError.response?.status;
        if (
          status &&
          [502, 503, 504].includes(status) &&
          attempt < KSEF_DEFAULTS.MAX_RETRIES
        ) {
          await this.auditLogService.log({
            companyId: options.companyId,
            userId: options.userId,
            action: options.auditAction,
            httpMethod: options.method,
            httpUrl: options.path,
            httpStatusCode: status,
            errorMessage: `Server error ${status}, retrying...`,
            durationMs,
          });
          continue;
        }

        // Log and throw for non-retryable errors
        await this.auditLogService.log({
          companyId: options.companyId,
          userId: options.userId,
          action: options.auditAction,
          entityType: options.auditEntityType,
          entityId: options.auditEntityId,
          httpMethod: options.method,
          httpUrl: options.path,
          httpStatusCode: axiosError.response?.status,
          errorMessage: axiosError.message ?? 'Unknown error',
          durationMs,
        });

        break;
      }
    }

    const lastResponse = (lastError as unknown as { response?: AxiosResponse } | undefined)?.response;
    const wasServerError = lastResponse
      ? [502, 503, 504].includes(lastResponse.status)
      : false;

    // Enrich the exception with the KSeF-provided exceptionCode + a
    // user-friendly Polish description when we can parse one. The auth /
    // session retry wrappers use `instanceof KsefApiException` to decide
    // whether to retry; downstream UIs surface `error.message` directly.
    const ksefError = this.parseKsefError(lastResponse?.data);
    const detail = ksefError
      ? getKsefErrorMessage(ksefError.code, ksefError.description ?? lastError?.message)
      : lastError?.message ?? 'KSeF API request failed';
    throw new KsefApiException(detail, wasServerError, ksefError?.code);
  }

  /**
   * Best-effort extraction of KSeF's structured error payload.
   *
   * KSeF v2 uses a few shapes depending on the endpoint:
   *  - synchronous errors:    `{ exceptionCode, exceptionDescription, ... }`
   *  - async status objects:  `{ status: { code, description, ... } }`
   *  - batch error wrappers:  `{ exceptions: [{ exceptionCode, ... }] }`
   *
   * We probe each in turn. A null return means we couldn't recognise the
   * body — the caller falls back to the raw HTTP error message.
   */
  private parseKsefError(
    body: unknown,
  ): { code?: number; description?: string } | null {
    if (!body || typeof body !== 'object') return null;
    const b = body as Record<string, unknown>;

    if (typeof b['exceptionCode'] === 'number') {
      return {
        code: b['exceptionCode'] as number,
        description:
          (b['exceptionDescription'] as string | undefined) ??
          (b['exceptionDescriptionInternal'] as string | undefined) ??
          (b['detail'] as string | undefined),
      };
    }

    const status = b['status'];
    if (status && typeof status === 'object') {
      const s = status as Record<string, unknown>;
      if (typeof s['code'] === 'number') {
        return {
          code: s['code'] as number,
          description: s['description'] as string | undefined,
        };
      }
    }

    const exceptions = b['exceptions'];
    if (Array.isArray(exceptions) && exceptions.length > 0) {
      const first = exceptions[0] as Record<string, unknown>;
      if (typeof first['exceptionCode'] === 'number') {
        return {
          code: first['exceptionCode'] as number,
          description:
            (first['exceptionDescription'] as string | undefined) ??
            (first['exceptionDescriptionInternal'] as string | undefined),
        };
      }
    }

    return null;
  }

  /**
   * Get an HTTPS agent with client certificate for mTLS, if the company is
   * configured for the XAdES auth flow AND has certificate credentials uploaded.
   *
   * Important: KSeF v2 token-based auth (`/auth/ksef-token`) does NOT use mTLS.
   * Attaching a client certificate to a token-auth request causes the demo
   * environment to reject the TLS handshake or return 21115 ("Nieprawidłowy
   * certyfikat"), which is easy to misread as a generic encryption failure.
   *
   * Therefore we only attach the agent when `authMethod === XADES`. For TOKEN
   * auth — even if a leftover certificate is present in `KsefConfiguration` —
   * we deliberately fall through to the default Node TLS agent.
   *
   * Cached per company; the cache is cleared on config change.
   */
  private async getHttpsAgent(companyId: string): Promise<https.Agent | undefined> {
    const cached = this.agentCache.get(companyId);
    if (cached) return cached;

    const config = await this.configRepo.findOne({ where: { companyId } });
    if (!config) return undefined;

    if (config.authMethod !== KsefAuthMethod.XADES) {
      // Token auth path. Don't leak a stray certificate into the TLS handshake.
      if (config.encryptedCertificate || config.encryptedPrivateKey) {
        this.logger.debug(
          `Company ${companyId} has certificate credentials but auth method is ${config.authMethod}; skipping mTLS agent (KSeF token auth uses Bearer JWT, not mTLS).`,
        );
      }
      return undefined;
    }

    if (!config.encryptedCertificate || !config.encryptedPrivateKey) {
      return undefined;
    }

    try {
      const cert = await this.encryptionService.decrypt(config.encryptedCertificate);
      const key = await this.encryptionService.decrypt(config.encryptedPrivateKey);
      const passphrase = config.encryptedCertificatePassword
        ? await this.encryptionService.decrypt(config.encryptedCertificatePassword)
        : undefined;

      const agent = new https.Agent({ cert, key, passphrase });
      this.agentCache.set(companyId, agent);
      this.logger.debug(`Attached mTLS client certificate for company ${companyId} (XAdES auth).`);
      return agent;
    } catch (error) {
      this.logger.warn(
        `Failed to create mTLS agent for company ${companyId}: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  /**
   * Clear cached HTTPS agent for a company (e.g., on config change).
   */
  clearAgentCache(companyId: string): void {
    const agent = this.agentCache.get(companyId);
    if (agent) {
      agent.destroy();
      this.agentCache.delete(companyId);
    }
  }

  private truncateResponse(data: unknown): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return str?.substring(0, 500) ?? '';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
