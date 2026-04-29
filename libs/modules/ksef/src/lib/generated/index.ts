/**
 * KSeF API types generated from official OpenAPI specifications.
 *
 * Re-generate with: bun run ksef:generate
 *
 * Specs:
 * - PROD: https://api.ksef.mf.gov.pl/docs/v2/openapi.json
 * - DEMO: https://api-demo.ksef.mf.gov.pl/docs/v2/openapi.json
 * - TEST: https://api-test.ksef.mf.gov.pl/docs/v2/openapi.json
 *
 * DEMO and PROD have identical schemas (59 paths, 253 schemas).
 * TEST has 14 extra /testdata/* endpoints (73 paths, 287 schemas).
 */

export type { components as KsefProdSchemas, paths as KsefProdPaths } from './ksef-api-prod';
export type { components as KsefDemoSchemas, paths as KsefDemoPaths } from './ksef-api-demo';
export type { components as KsefTestSchemas, paths as KsefTestPaths } from './ksef-api-test';

// Convenience aliases — PROD schemas are the canonical reference (identical to DEMO)
export type { components as KsefSchemas } from './ksef-api-prod';

// Common type shortcuts for services
import type { components } from './ksef-api-prod';

// Auth
export type KsefChallengeResponse = components['schemas']['AuthenticationChallengeResponse'];
export type KsefAuthInitResponse = components['schemas']['AuthenticationInitResponse'];
export type KsefAuthStatusResponse = components['schemas']['AuthenticationOperationStatusResponse'];
export type KsefTokenRedeemResponse = components['schemas']['AuthenticationTokensResponse'];
export type KsefTokenRefreshResponse = components['schemas']['AuthenticationTokenRefreshResponse'];

// Security
export type KsefPublicKeyCertificate = components['schemas']['PublicKeyCertificate'];

// Invoices
export type KsefInvoiceMetadata = components['schemas']['InvoiceMetadata'];
export type KsefInvoiceQueryFilters = components['schemas']['InvoiceQueryFilters'];
export type KsefQueryInvoicesResponse = components['schemas']['QueryInvoicesMetadataResponse'];
export type KsefInvoiceQueryDateRange = components['schemas']['InvoiceQueryDateRange'];

// Sessions
export type KsefSessionOpenResponse = components['schemas']['OpenOnlineSessionResponse'];
export type KsefSessionStatusResponse = components['schemas']['SessionStatusResponse'];
