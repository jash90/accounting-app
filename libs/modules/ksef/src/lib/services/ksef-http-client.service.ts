import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

import { KsefEnvironment } from '@accounting/common';

import { KSEF_BASE_URLS, KSEF_DEFAULTS } from '../constants';
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

  constructor(
    private readonly httpService: HttpService,
    private readonly auditLogService: KsefAuditLogService,
  ) {}

  getBaseUrl(environment: KsefEnvironment): string {
    return KSEF_BASE_URLS[environment];
  }

  async request<T = unknown>(options: KsefRequestOptions): Promise<KsefResponse<T>> {
    const baseUrl = this.getBaseUrl(options.environment);
    const url = `${baseUrl}${options.path}`;
    const startTime = Date.now();

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

    const wasServerError = lastError && 'response' in (lastError as unknown as Record<string, unknown>)
      && [502, 503, 504].includes((lastError as unknown as { response?: { status?: number } }).response?.status ?? 0);
    throw new KsefApiException(lastError?.message ?? 'KSeF API request failed', wasServerError);
  }

  private truncateResponse(data: unknown): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return str?.substring(0, 500) ?? '';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
