/**
 * Opt-in end-to-end verification of `KsefXadesSignerService` against KSeF demo.
 *
 * Why this exists: the unit tests for the XAdES signer can only verify
 * internal consistency — they re-apply the same c14n transform to the
 * signer's output and verify the signature. That's circular; if the
 * signer's c14n disagrees with the spec in some edge case, the unit
 * tests can't catch it. The only authoritative check is whether KSeF
 * accepts the signed AuthTokenRequest.
 *
 * What this script does:
 *   1. Decrypts the user's KSeF cert + private key (Node-side OpenSSL
 *      because Bun and OpenSSL 3.6 CLI both choke on KSeF-issued PKCS#8).
 *   2. Calls `POST /auth/challenge` against demo.
 *   3. Builds + signs the AuthTokenRequest via the production
 *      `KsefXadesSignerService` (the SAME code path the API uses).
 *   4. POSTs to `/auth/xades-signature`.
 *   5. Polls `/auth/{ref}` until status.code === 200 (success) or 4xx
 *      (failure). Reports the outcome.
 *
 * Success criteria: KSeF returns HTTP 202 with a referenceNumber AND the
 * subsequent poll returns status.code === 200. If KSeF returns 9105
 * ("Format podpisu niezgodny") the c14n is wrong; if 21115 ("Nieprawidłowy
 * certyfikat") the cert/key pairing is wrong.
 *
 * Required env:
 *   KSEF_KEY_PASSPHRASE   passphrase for the encrypted PKCS#8 key
 *
 * Optional env (mirrors `scripts/ksef-demo-send.ts`):
 *   KSEF_NIP              context NIP (default: 8191654690)
 *   KSEF_CERT             cert path (default: keys/online cer.crt)
 *   KSEF_KEY              key path  (default: keys/online cer.key)
 *   KSEF_BASE_URL         KSeF v2 base URL (default: demo)
 *
 * Usage:
 *   KSEF_KEY_PASSPHRASE='your-secret' bun scripts/ksef-xades-verify.ts
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import * as crypto from 'node:crypto';

import { KsefXadesSignerService } from '../libs/modules/ksef/src/lib/services/ksef-xades-signer.service';

const PASS = process.env.KSEF_KEY_PASSPHRASE;
const NIP = process.env.KSEF_NIP ?? '8191654690';
const CERT_PATH = resolve(process.env.KSEF_CERT ?? 'keys/online cer.crt');
const KEY_PATH = resolve(process.env.KSEF_KEY ?? 'keys/online cer.key');
const BASE_URL = process.env.KSEF_BASE_URL ?? 'https://api-demo.ksef.mf.gov.pl/v2';
const TMP_KEY_PEM = '/tmp/ksef-xades-verify-key.pem';

function fail(msg: string): never {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function step(n: number, title: string) {
  console.log(`\n── Step ${n}: ${title} ─────────────────────────────`);
}

async function ksef<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
  init: { body?: string; headers?: Record<string, string> } = {},
): Promise<{ status: number; data: T; raw: string }> {
  const url = `${BASE_URL}${path}`;
  const isXml = init.body?.startsWith('<') ?? false;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers ?? {}),
  };
  if (init.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = isXml ? 'application/xml' : 'application/json';
  }

  const res = await fetch(url, { method, headers, body: init.body });
  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  console.log(`  ${method} ${path} → HTTP ${res.status}`);
  if (res.status >= 400) {
    console.log(`  body: ${raw.substring(0, 600)}`);
  }
  return { status: res.status, data: data as T, raw };
}

function decryptKey(): crypto.KeyObject {
  step(1, 'Decrypt private key (via Node OpenSSL — Bun BoringSSL fails on KSeF PKCS#8)');
  if (!existsSync(KEY_PATH)) fail(`Key not found at ${KEY_PATH}`);
  if (!existsSync(CERT_PATH)) fail(`Cert not found at ${CERT_PATH}`);

  // Same trick as ksef-demo-send.ts — shell out to `node -e` to use the
  // full OpenSSL build (Bun's BoringSSL fails on KSeF-exported PKCS#8).
  const decryptScript = `
    const fs = require('fs');
    const crypto = require('crypto');
    const enc = fs.readFileSync(${JSON.stringify(KEY_PATH)}, 'utf-8');
    const k = crypto.createPrivateKey({ key: enc, passphrase: process.env.KSEF_KEY_PASSPHRASE });
    const pem = k.export({ type: 'pkcs8', format: 'pem' }).toString('utf-8');
    fs.writeFileSync(${JSON.stringify(TMP_KEY_PEM)}, pem, { mode: 0o600 });
    process.stdout.write(k.asymmetricKeyType || 'unknown');
  `;
  let keyType = 'unknown';
  try {
    keyType = execFileSync('node', ['-e', decryptScript], {
      env: { ...process.env, KSEF_KEY_PASSPHRASE: PASS! },
      encoding: 'utf-8',
    });
  } catch (err) {
    fail(`Private key decryption failed: ${(err as Error).message}`);
  }
  console.log(`  ✓ decrypted ${keyType.toUpperCase()} key → ${TMP_KEY_PEM}`);
  return crypto.createPrivateKey(readFileSync(TMP_KEY_PEM, 'utf-8'));
}

interface ChallengeResponse {
  challenge: string;
  timestamp: string;
  timestampMs: number;
}

interface AuthInitResponse {
  referenceNumber: string;
  authenticationToken: { token: string; validUntil: string };
}

interface AuthStatusResponse {
  status: { code: number; description: string };
}

async function main() {
  if (!PASS) {
    console.error(
      'KSEF_KEY_PASSPHRASE not set. Run with:\n' +
        "  KSEF_KEY_PASSPHRASE='your-secret' bun scripts/ksef-xades-verify.ts",
    );
    process.exit(2);
  }

  console.log('🔐 KSeF v2 XAdES auth — verify against demo via the production signer');
  console.log(`   base:    ${BASE_URL}`);
  console.log(`   nip:     ${NIP}`);
  console.log(`   cert:    ${CERT_PATH}`);
  console.log(`   key:     ${KEY_PATH}`);

  try {
    const privateKey = decryptKey();
    const certPem = readFileSync(CERT_PATH, 'utf-8');

    step(2, 'POST /auth/challenge');
    const { status: chStatus, data: chData } = await ksef<ChallengeResponse>(
      'POST',
      '/auth/challenge',
      { body: '{}' },
    );
    if (chStatus !== 200) fail(`challenge failed: ${JSON.stringify(chData)}`);
    console.log(`  challenge:    ${chData.challenge}`);

    step(3, 'Sign AuthTokenRequest via production KsefXadesSignerService');
    const signer = new KsefXadesSignerService();
    const signedXml = signer.signAuthTokenRequest({
      challenge: chData.challenge,
      nip: NIP,
      certificatePem: certPem,
      privateKey,
    });
    console.log(`  ✓ signed XML (${signedXml.length} bytes)`);

    step(4, 'POST /auth/xades-signature');
    const { status: authStatus, data: authData } = await ksef<AuthInitResponse>(
      'POST',
      '/auth/xades-signature',
      { body: signedXml, headers: { 'Content-Type': 'application/xml' } },
    );
    if (authStatus !== 202 && authStatus !== 200) {
      fail(
        `xades-signature failed: HTTP ${authStatus}.\n` +
          `If you got 9105, the c14n is wrong (subtree namespace propagation, whitespace, attribute ordering).\n` +
          `If you got 21115, the cert/key pair doesn't match.\n` +
          `If you got 21111, the challenge expired (re-run).`,
      );
    }
    console.log(`  ✓ ref=${authData.referenceNumber}`);

    step(5, `Poll /auth/${authData.referenceNumber} until status=200`);
    let succeeded = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const { data: pollData } = await ksef<AuthStatusResponse>(
        'GET',
        `/auth/${authData.referenceNumber}`,
        { headers: { Authorization: `Bearer ${authData.authenticationToken.token}` } },
      );
      const code = pollData.status?.code;
      console.log(`  attempt ${i + 1}: code=${code} ${pollData.status?.description ?? ''}`);
      if (code === 200) {
        succeeded = true;
        break;
      }
      if (code !== undefined && code >= 400) {
        fail(`Auth rejected by KSeF: ${pollData.status.description} (code ${code})`);
      }
    }
    if (!succeeded) fail('auth polling timed out');

    console.log('\n✅ XAdES auth flow accepted by KSeF demo — signer is correct.');
  } finally {
    try {
      if (existsSync(TMP_KEY_PEM)) rmSync(TMP_KEY_PEM);
    } catch {
      // best-effort
    }
  }
}

await main();
