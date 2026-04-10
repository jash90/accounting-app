import { Injectable, Logger } from '@nestjs/common';
import { KsefEnvironment, KsefConfiguration } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';
import { KsefAuthenticationException } from '../exceptions';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KSEF_API_PATHS, KSEF_DEFAULTS } from '../constants';

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface ChallengeResponse {
  timestamp: string;
  challenge: string;
}

interface AuthStatusResponse {
  processingCode: number;
  processingDescription: string;
  referenceNumber: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresIn?: number;
}

@Injectable()
export class KsefAuthService {
  private readonly logger = new Logger(KsefAuthService.name);
  private readonly tokenCache = new Map<string, CachedToken>();

  constructor(
    private readonly httpClient: KsefHttpClientService,
    private readonly configService: KsefConfigService,
    private readonly cryptoService: KsefCryptoService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Get a valid JWT token for a company, authenticating if needed.
   */
  async getValidToken(companyId: string, userId: string): Promise<string> {
    const cached = this.tokenCache.get(companyId);

    // Return cached token if still valid (with buffer)
    if (cached && cached.expiresAt > Date.now() + KSEF_DEFAULTS.JWT_REFRESH_BUFFER_MS) {
      return cached.accessToken;
    }

    // Try to refresh if we have a refresh token
    if (cached?.refreshToken) {
      try {
        return await this.refreshToken(companyId, userId, cached);
      } catch {
        this.logger.warn(`Token refresh failed for company ${companyId}, re-authenticating`);
        this.tokenCache.delete(companyId);
      }
    }

    // Full authentication
    return await this.authenticate(companyId, userId);
  }

  /**
   * Perform full authentication against KSeF.
   */
  async authenticate(companyId: string, userId: string): Promise<string> {
    const config = await this.configService.getConfigOrFail(companyId);

    // Step 1: Get challenge
    const challenge = await this.getChallenge(config.environment, companyId, userId);

    // Step 2: Authenticate with token
    const decryptedToken = await this.encryptionService.decrypt(config.encryptedToken!);

    // Encrypt token|timestamp with KSeF's RSA public key
    const rsaKeyResponse = await this.httpClient.request<{ publicKey: string }>({
      environment: config.environment,
      method: 'GET',
      path: KSEF_API_PATHS.PUBLIC_KEY,
      companyId,
      userId,
      auditAction: 'FETCH_PUBLIC_KEY',
    });

    const encryptedToken = this.cryptoService.encryptTokenForAuth(
      decryptedToken,
      challenge.timestamp,
      `-----BEGIN PUBLIC KEY-----\n${rsaKeyResponse.data.publicKey}\n-----END PUBLIC KEY-----`,
    );

    // Step 3: Submit authentication
    const authResponse = await this.httpClient.request<{ referenceNumber: string }>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.AUTH_TOKEN,
      data: {
        contextIdentifier: {
          type: 'Nip',
          identifier: config.nip,
        },
        encryptedToken,
        challenge: challenge.challenge,
      },
      companyId,
      userId,
      auditAction: 'AUTH_TOKEN_SUBMIT',
    });

    // Step 4: Poll for auth status and redeem tokens
    const tokens = await this.pollAuthStatus(
      config.environment,
      authResponse.data.referenceNumber,
      companyId,
      userId,
    );

    // Cache tokens
    this.tokenCache.set(companyId, tokens);

    this.logger.log(`Successfully authenticated company ${companyId} with KSeF`);
    return tokens.accessToken;
  }

  /**
   * Test connection to KSeF without caching tokens.
   */
  async testConnection(companyId: string, userId: string): Promise<{ success: boolean; message: string; responseTimeMs: number }> {
    const config = await this.configService.getConfigOrFail(companyId);
    const startTime = Date.now();

    try {
      await this.getChallenge(config.environment, companyId, userId);
      return {
        success: true,
        message: 'Połączenie z KSeF zostało nawiązane pomyślnie',
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `Nie udało się połączyć z KSeF: ${(error as Error).message}`,
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  private async getChallenge(
    environment: KsefEnvironment,
    companyId: string,
    userId: string,
  ): Promise<ChallengeResponse> {
    const response = await this.httpClient.request<ChallengeResponse>({
      environment,
      method: 'POST',
      path: KSEF_API_PATHS.AUTH_CHALLENGE,
      data: {},
      companyId,
      userId,
      auditAction: 'AUTH_CHALLENGE',
    });
    return response.data;
  }

  private async refreshToken(
    companyId: string,
    userId: string,
    cached: CachedToken,
  ): Promise<string> {
    const config = await this.configService.getConfigOrFail(companyId);

    const response = await this.httpClient.request<{
      accessToken: string;
      refreshToken: string;
      ExpiresIn: number;
    }>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.TOKEN_REFRESH,
      headers: { Authorization: `Bearer ${cached.refreshToken}` },
      companyId,
      userId,
      auditAction: 'AUTH_TOKEN_REFRESH',
    });

    const newCached: CachedToken = {
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresAt: Date.now() + response.data.ExpiresIn * 1000,
    };

    this.tokenCache.set(companyId, newCached);
    return newCached.accessToken;
  }

  private async pollAuthStatus(
    environment: KsefEnvironment,
    referenceNumber: string,
    companyId: string,
    userId: string,
  ): Promise<CachedToken> {
    const maxAttempts = 10;
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await this.httpClient.request<AuthStatusResponse>({
        environment,
        method: 'GET',
        path: `${KSEF_API_PATHS.AUTH_STATUS}/${referenceNumber}`,
        companyId,
        userId,
        auditAction: 'AUTH_STATUS_POLL',
      });

      const status = statusResponse.data;

      if (status.processingCode === 200 && status.accessToken) {
        // Redeem tokens
        const redeemResponse = await this.httpClient.request<{
          accessToken: string;
          refreshToken: string;
          tokenExpiresIn: number;
        }>({
          environment,
          method: 'POST',
          path: KSEF_API_PATHS.TOKEN_REDEEM,
          headers: { Authorization: `Bearer ${status.accessToken}` },
          companyId,
          userId,
          auditAction: 'AUTH_TOKEN_REDEEM',
        });

        return {
          accessToken: redeemResponse.data.accessToken,
          refreshToken: redeemResponse.data.refreshToken,
          expiresAt: Date.now() + redeemResponse.data.tokenExpiresIn * 1000,
        };
      }

      if (status.processingCode >= 400) {
        throw new KsefAuthenticationException();
      }
    }

    throw new KsefAuthenticationException();
  }

  /**
   * Clear cached tokens for a company (e.g., on config change).
   */
  clearTokenCache(companyId: string): void {
    this.tokenCache.delete(companyId);
  }
}
