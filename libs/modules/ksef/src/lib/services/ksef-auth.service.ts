import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';
import { KsefAuthMethod, KsefEnvironment } from '@accounting/common';
import { EncryptionService } from '@accounting/common/backend';
import { KsefApiException, KsefAuthenticationException } from '../exceptions';
import type {
  KsefChallengeResponse,
  KsefAuthInitResponse,
  KsefAuthStatusResponse,
  KsefTokenRedeemResponse,
  KsefTokenRefreshResponse,
} from '../generated';
import { KsefHttpClientService } from './ksef-http-client.service';
import { KsefConfigService } from './ksef-config.service';
import { KsefCryptoService } from './ksef-crypto.service';
import { KsefXadesSignerService } from './ksef-xades-signer.service';
import { KSEF_API_PATHS, KSEF_DEFAULTS } from '../constants';

interface CachedToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable()
export class KsefAuthService {
  private readonly logger = new Logger(KsefAuthService.name);
  private readonly tokenCache = new Map<string, CachedToken>();

  constructor(
    private readonly httpClient: KsefHttpClientService,
    @Inject(forwardRef(() => KsefConfigService))
    private readonly configService: KsefConfigService,
    private readonly cryptoService: KsefCryptoService,
    private readonly encryptionService: EncryptionService,
    private readonly xadesSigner: KsefXadesSignerService,
  ) {}

  /**
   * Get a valid JWT accessToken for a company, authenticating if needed.
   */
  async getValidToken(companyId: string, userId: string): Promise<string> {
    const config = await this.configService.getConfigOrFail(companyId);
    const cacheKey = `${companyId}:${config.environment}`;
    const cached = this.tokenCache.get(cacheKey);

    // Return cached token if still valid (with buffer)
    if (cached && cached.expiresAt > Date.now() + KSEF_DEFAULTS.JWT_REFRESH_BUFFER_MS) {
      return cached.accessToken;
    }

    // Try to refresh if we have a refresh token
    if (cached?.refreshToken) {
      try {
        return await this.refreshToken(companyId, userId, cached, cacheKey);
      } catch {
        this.logger.warn(`Token refresh failed for company ${companyId}, re-authenticating`);
        this.tokenCache.delete(cacheKey);
      }
    }

    // Full authentication
    return await this.authenticate(companyId, userId);
  }

  /**
   * Authenticate with KSeF using the company's configured method.
   *
   * Two flows are supported:
   *   - TOKEN: encrypt the user's KSeF API token with the MoF public key and
   *     POST it to `/auth/ksef-token` (see `runTokenAuth`).
   *   - XADES: build an `<AuthTokenRequest>` body, sign it with the user's
   *     own X.509 cert as XAdES-BES, and POST it to `/auth/xades-signature`
   *     (see `authenticateViaXades`).
   *
   * Both flows reuse the same `pollAuthStatus` and `redeemTokens` paths
   * once the initial submission succeeds.
   *
   * On transient failures we retry exactly once with `forceRefresh: true`,
   * which drops the cached MoF public key and re-fetches it. The retry only
   * fires on `KsefApiException` (HTTP-layer non-2xx, including the spec's
   * 415 "Błąd odszyfrowania dostarczonego klucza", which IS recoverable
   * after a public-key rotation). `KsefAuthenticationException` is raised
   * when `/auth/{ref}` polling explicitly returned a terminal failure
   * status (21111 / 21115 / 21117 / 21301 etc). None of those recover from
   * re-fetching the public key, so surfacing them immediately is correct.
   *
   * mTLS (client certificate) is only attached for the XAdES auth method —
   * see `KsefHttpClientService.getHttpsAgent`.
   */
  async authenticate(companyId: string, userId: string): Promise<string> {
    try {
      return await this.dispatchAuth(companyId, userId, false);
    } catch (error) {
      if (error instanceof KsefApiException) {
        this.logger.warn(
          `KSeF auth failed (${(error as Error).message}); retrying once with a forced public-key refresh`,
        );
        return await this.dispatchAuth(companyId, userId, true);
      }
      throw error;
    }
  }

  private async dispatchAuth(
    companyId: string,
    userId: string,
    forceRefresh: boolean,
  ): Promise<string> {
    const config = await this.configService.getConfigOrFail(companyId);
    if (config.authMethod === KsefAuthMethod.XADES) {
      return this.authenticateViaXades(companyId, userId, forceRefresh);
    }
    return this.runTokenAuth(companyId, userId, forceRefresh);
  }

  private async runTokenAuth(
    companyId: string,
    userId: string,
    forceRefresh: boolean,
  ): Promise<string> {
    const config = await this.configService.getConfigOrFail(companyId);

    // Step 1: Get challenge
    const challenge = await this.getChallenge(config.environment, companyId, userId);

    // Step 2: Encrypt token using timestampMs (Unix milliseconds)
    const decryptedToken = await this.encryptionService.decrypt(config.encryptedToken!);

    const rsaPublicKeyPem = await this.cryptoService.getRsaPublicKeyPemForTokenAuth(
      config.environment,
      companyId,
      userId,
      forceRefresh,
    );

    const encryptedToken = this.cryptoService.encryptTokenForAuth(
      decryptedToken,
      String(challenge.timestampMs),
      rsaPublicKeyPem,
    );

    // Step 3: Submit authentication via /auth/ksef-token
    const authResponse = await this.httpClient.request<KsefAuthInitResponse>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.AUTH_TOKEN,
      data: {
        contextIdentifier: {
          type: 'Nip',
          value: config.nip,
        },
        encryptedToken,
        challenge: challenge.challenge,
      },
      companyId,
      userId,
      auditAction: 'AUTH_TOKEN_SUBMIT',
    });

    const { referenceNumber, authenticationToken } = authResponse.data;

    // Step 4: Poll for auth status using the temporary authenticationToken
    const authSucceeded = await this.pollAuthStatus(
      config.environment,
      referenceNumber,
      authenticationToken.token,
      companyId,
      userId,
    );

    if (!authSucceeded) {
      throw new KsefAuthenticationException();
    }

    // Step 5: Redeem tokens via /auth/token/redeem
    const tokens = await this.redeemTokens(
      config.environment,
      authenticationToken.token,
      companyId,
      userId,
    );

    // Cache tokens
    const cacheKey = `${companyId}:${config.environment}`;
    this.tokenCache.set(cacheKey, tokens);

    this.logger.log(
      `Successfully authenticated company ${companyId} with KSeF${forceRefresh ? ' (after forced public-key refresh)' : ''}`,
    );
    return tokens.accessToken;
  }

  /**
   * XAdES-BES authentication flow:
   *   1. Decrypt the user's at-rest cert + private key + KSeF passphrase.
   *   2. Use Node's full OpenSSL (`crypto.createPrivateKey`) to peel the
   *      encrypted PKCS#8 wrapping. Bun's BoringSSL and OpenSSL 3.6 CLI
   *      both fail on KSeF-issued PKCS#8 keys; this is the reason the API
   *      runs on Node and not Bun in production.
   *   3. POST `/auth/challenge` to get the challenge string.
   *   4. Generate the XAdES-BES signed `<AuthTokenRequest>` body via
   *      `KsefXadesSignerService`.
   *   5. POST it to `/auth/xades-signature` as `application/xml` —
   *      response shape matches `/auth/ksef-token` (referenceNumber +
   *      authenticationToken).
   *   6. Reuse `pollAuthStatus` + `redeemTokens` for the rest of the flow.
   *
   * `forceRefresh` is accepted for symmetry with `runTokenAuth` (so the
   * outer retry-once wrapper in `authenticate()` can call us either way),
   * but it's a no-op in this flow because XAdES auth doesn't depend on the
   * MoF public-key cache.
   */
  async authenticateViaXades(
    companyId: string,
    userId: string,
    forceRefresh: boolean,
  ): Promise<string> {
    const config = await this.configService.getConfigOrFail(companyId);

    if (!config.nip) {
      throw new KsefAuthenticationException(
        'Konfiguracja XAdES wymaga NIP firmy w ustawieniach KSeF',
      );
    }
    if (!config.encryptedCertificate || !config.encryptedPrivateKey) {
      throw new KsefAuthenticationException(
        'Konfiguracja XAdES wymaga certyfikatu i klucza prywatnego',
      );
    }

    const certificatePem = await this.encryptionService.decrypt(config.encryptedCertificate);
    const privateKeyPem = await this.encryptionService.decrypt(config.encryptedPrivateKey);
    const passphrase = config.encryptedCertificatePassword
      ? await this.encryptionService.decrypt(config.encryptedCertificatePassword)
      : undefined;

    let privateKey: crypto.KeyObject;
    try {
      privateKey = crypto.createPrivateKey({
        key: privateKeyPem,
        ...(passphrase ? { passphrase } : {}),
      });
    } catch (error) {
      throw new KsefAuthenticationException(
        `Nie udało się odszyfrować klucza prywatnego — sprawdź hasło certyfikatu (${
          error instanceof Error ? error.message : String(error)
        })`,
      );
    }

    // Step 1 — challenge
    const challenge = await this.getChallenge(config.environment, companyId, userId);

    // Step 2 — build + sign the AuthTokenRequest XAdES-BES body
    const signedXml = this.xadesSigner.signAuthTokenRequest({
      challenge: challenge.challenge,
      nip: config.nip,
      certificatePem,
      privateKey,
    });

    // Step 3 — POST signed XML
    const authResponse = await this.httpClient.request<KsefAuthInitResponse>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.AUTH_XADES,
      data: signedXml,
      headers: { 'Content-Type': 'application/xml' },
      companyId,
      userId,
      auditAction: 'AUTH_XADES_SUBMIT',
    });

    const { referenceNumber, authenticationToken } = authResponse.data;

    // Step 4 — poll until KSeF either accepts (status.code === 200) or
    //          rejects (status.code >= 400)
    const authSucceeded = await this.pollAuthStatus(
      config.environment,
      referenceNumber,
      authenticationToken.token,
      companyId,
      userId,
    );
    if (!authSucceeded) {
      throw new KsefAuthenticationException();
    }

    // Step 5 — redeem
    const tokens = await this.redeemTokens(
      config.environment,
      authenticationToken.token,
      companyId,
      userId,
    );

    const cacheKey = `${companyId}:${config.environment}`;
    this.tokenCache.set(cacheKey, tokens);

    this.logger.log(
      `Successfully XAdES-authenticated company ${companyId} with KSeF${
        forceRefresh ? ' (retry attempt)' : ''
      }`,
    );
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
  ): Promise<KsefChallengeResponse> {
    const response = await this.httpClient.request<KsefChallengeResponse>({
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
    cacheKey: string,
  ): Promise<string> {
    const config = await this.configService.getConfigOrFail(companyId);

    // POST /auth/token/refresh with refreshToken as Bearer
    const response = await this.httpClient.request<KsefTokenRefreshResponse>({
      environment: config.environment,
      method: 'POST',
      path: KSEF_API_PATHS.TOKEN_REFRESH,
      headers: { Authorization: `Bearer ${cached.refreshToken}` },
      companyId,
      userId,
      auditAction: 'AUTH_TOKEN_REFRESH',
    });

    // Parse validUntil to compute expiry
    const validUntil = new Date(response.data.accessToken.validUntil).getTime();

    const newCached: CachedToken = {
      accessToken: response.data.accessToken.token,
      refreshToken: cached.refreshToken, // refreshToken stays the same
      expiresAt: validUntil,
    };

    this.tokenCache.set(cacheKey, newCached);
    return newCached.accessToken;
  }

  /**
   * Poll GET /auth/{referenceNumber} until status.code is 200 (success) or 400+ (failure).
   * Uses the temporary authenticationToken from the auth submission response.
   */
  private async pollAuthStatus(
    environment: KsefEnvironment,
    referenceNumber: string,
    authenticationToken: string,
    companyId: string,
    userId: string,
  ): Promise<boolean> {
    const maxAttempts = 15;
    const pollInterval = 2000;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await this.httpClient.request<KsefAuthStatusResponse>({
        environment,
        method: 'GET',
        path: `${KSEF_API_PATHS.AUTH_STATUS}/${referenceNumber}`,
        headers: { Authorization: `Bearer ${authenticationToken}` },
        companyId,
        userId,
        auditAction: 'AUTH_STATUS_POLL',
      });

      const statusCode = statusResponse.data.status.code;

      // 200 = authentication succeeded
      if (statusCode === 200) {
        return true;
      }

      // 100 = still processing, continue polling
      if (statusCode === 100) {
        continue;
      }

      // 400+ = authentication failed
      if (statusCode >= 400) {
        this.logger.error(
          `KSeF auth failed with code ${statusCode}: ${statusResponse.data.status.description}`,
        );
        return false;
      }
    }

    this.logger.error('KSeF auth polling timed out');
    return false;
  }

  /**
   * Redeem access and refresh tokens via POST /auth/token/redeem.
   * This is a one-time operation — the authenticationToken can only be redeemed once.
   */
  private async redeemTokens(
    environment: KsefEnvironment,
    authenticationToken: string,
    companyId: string,
    userId: string,
  ): Promise<CachedToken> {
    const redeemResponse = await this.httpClient.request<KsefTokenRedeemResponse>({
      environment,
      method: 'POST',
      path: KSEF_API_PATHS.TOKEN_REDEEM,
      headers: { Authorization: `Bearer ${authenticationToken}` },
      companyId,
      userId,
      auditAction: 'AUTH_TOKEN_REDEEM',
    });

    const validUntil = new Date(redeemResponse.data.accessToken.validUntil).getTime();

    return {
      accessToken: redeemResponse.data.accessToken.token,
      refreshToken: redeemResponse.data.refreshToken.token,
      expiresAt: validUntil,
    };
  }

  /**
   * Clear cached tokens for a company (e.g., on config change).
   */
  clearTokenCache(companyId: string): void {
    for (const key of this.tokenCache.keys()) {
      if (key.startsWith(`${companyId}:`)) {
        this.tokenCache.delete(key);
      }
    }
  }
}
