/**
 * End-to-end KSeF v2 demo submission (XAdES auth → session → invoice → UPO).
 *
 * Required env:
 *   KSEF_KEY_PASSPHRASE   — passphrase for the encrypted PKCS#8 private key
 *
 * Optional env:
 *   KSEF_NIP              — context NIP (default: 8191654690 — seller in the sample invoice)
 *   KSEF_INVOICE          — path to invoice XML (default: docs/ksef-sample-invoice.xml)
 *   KSEF_CERT             — path to PEM cert  (default: keys/app demo ksef.crt)
 *   KSEF_KEY              — path to PKCS#8 encrypted key (default: keys/app demo ksef.key)
 *   KSEF_BASE_URL         — KSeF v2 base URL  (default: https://api-demo.ksef.mf.gov.pl/v2)
 *
 * Usage:
 *   KSEF_KEY_PASSPHRASE='your-secret' bun scripts/ksef-demo-send.ts
 *
 * Outputs (under /tmp):
 *   ksef-auth-template.xml, ksef-auth-signed.xml, ksef-key-decrypted.pem
 *   ksef-upo-<sessionRef>.xml (when UPO becomes available)
 *
 * The decrypted PEM and signed XML are written to /tmp with mode 0600 and
 * deleted at the end (best-effort; the `finally` block also wipes them).
 */
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import * as crypto from 'node:crypto';

// ── Config ──────────────────────────────────────────────────────────────

const PASS = process.env.KSEF_KEY_PASSPHRASE;
const NIP = process.env.KSEF_NIP ?? '8191654690';
const INVOICE_PATH = resolve(process.env.KSEF_INVOICE ?? 'docs/ksef-sample-invoice.xml');
const CERT_PATH = resolve(process.env.KSEF_CERT ?? 'keys/app demo ksef.crt');
const KEY_PATH = resolve(process.env.KSEF_KEY ?? 'keys/app demo ksef.key');
const BASE_URL = process.env.KSEF_BASE_URL ?? 'https://api-demo.ksef.mf.gov.pl/v2';

const TMP_TEMPLATE = '/tmp/ksef-auth-template.xml';
const TMP_SIGNED = '/tmp/ksef-auth-signed.xml';
const TMP_KEY_PEM = '/tmp/ksef-key-decrypted.pem';
// xmlsec1 has trouble with paths containing spaces and the cert lookup is
// finicky; we always copy the cert to a stable no-space path before signing.
const TMP_CERT_PEM = '/tmp/ksef-cert.pem';

const cleanupPaths = [TMP_TEMPLATE, TMP_SIGNED, TMP_KEY_PEM, TMP_CERT_PEM];

// ── Helpers ─────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function step(n: number, title: string) {
  console.log(`\n── Step ${n}: ${title} ─────────────────────────────`);
}

function pretty(value: unknown) {
  return JSON.stringify(value, null, 2);
}

async function ksef<T = unknown>(
  method: 'GET' | 'POST',
  path: string,
  init: { body?: string | object; headers?: Record<string, string> } = {},
): Promise<{ status: number; data: T; raw: string }> {
  const url = `${BASE_URL}${path}`;
  const isXml = typeof init.body === 'string' && init.body.startsWith('<');
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers ?? {}),
  };
  if (init.body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = isXml ? 'application/xml' : 'application/json';
  }

  const body =
    typeof init.body === 'string' || init.body === undefined
      ? (init.body as string | undefined)
      : JSON.stringify(init.body);

  const res = await fetch(url, { method, headers, body });
  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  console.log(`  ${method} ${path} → HTTP ${res.status}`);
  if (res.status >= 400) {
    console.log(`  body: ${raw.substring(0, 500)}`);
  }
  return { status: res.status, data: data as T, raw };
}

// ── 1) Decrypt the private key into a temp PEM (0600) ───────────────────

function decryptKey() {
  step(1, 'Decrypt private key');
  if (!existsSync(KEY_PATH)) fail(`Key not found at ${KEY_PATH}`);
  if (!existsSync(CERT_PATH)) fail(`Cert not found at ${CERT_PATH}`);

  // KSeF self-issued .key files are encrypted PKCS#8 (PBES2/PBKDF2-SHA256/AES-256-CBC).
  // We must decrypt with **Node's** crypto, not Bun's, and not OpenSSL 3.6 CLI:
  //   - OpenSSL 3.6 CLI: known to fail on these files with `Error decrypting key`
  //     even with the right passphrase.
  //   - Bun (BoringSSL):  fails with `PKCS8 routines:OPENSSL_internal:DECODE_ERROR`.
  //   - Node 18+ (full OpenSSL): works.
  // We always shell out to `node -e` so this works regardless of which runtime
  // invoked the script.
  try {
    const decryptScript = `
      const fs = require('fs');
      const crypto = require('crypto');
      const enc = fs.readFileSync(${JSON.stringify(KEY_PATH)}, 'utf-8');
      const k = crypto.createPrivateKey({ key: enc, passphrase: process.env.KSEF_KEY_PASSPHRASE });
      const pem = k.export({ type: 'pkcs8', format: 'pem' }).toString('utf-8');
      fs.writeFileSync(${JSON.stringify(TMP_KEY_PEM)}, pem, { mode: 0o600 });
      fs.chmodSync(${JSON.stringify(TMP_KEY_PEM)}, 0o600);
      process.stdout.write(k.asymmetricKeyType || 'unknown');
    `;
    const out = execFileSync('node', ['-e', decryptScript], {
      env: { ...process.env, KSEF_KEY_PASSPHRASE: PASS! },
      encoding: 'utf-8',
    });
    console.log(`  ✓ decrypted ${out.toUpperCase()} key → ${TMP_KEY_PEM} (mode 0600)`);
  } catch (err) {
    fail(`Private key decryption failed: ${(err as Error).message}`);
  }
}

// ── 2) Get challenge ────────────────────────────────────────────────────

interface ChallengeResponse {
  challenge: string;
  timestamp: string;
  timestampMs: number;
}

async function getChallenge(): Promise<ChallengeResponse> {
  step(2, 'POST /auth/challenge');
  const { status, data } = await ksef<ChallengeResponse>('POST', '/auth/challenge', { body: {} });
  if (status !== 200) fail(`challenge failed: ${pretty(data)}`);
  console.log(`  challenge:    ${data.challenge}`);
  console.log(`  timestampMs:  ${data.timestampMs}`);
  return data;
}

// ── 3) Build AuthTokenRequest XML + XAdES sign ──────────────────────────

/**
 * Convert an OpenSSL/Node-style DN ("C=PL, O=Foo, CN=Bar") into the
 * RFC-2253-ish form expected inside <ds:X509IssuerName>.
 *
 * Node returns the subject/issuer in roughly the right order separated by ", ";
 * for simple ASCII subjects this is already a valid RFC-2253 string. We trim
 * surrounding whitespace and collapse the separators just in case.
 */
function dnFromCert(cert: crypto.X509Certificate, which: 'issuer' | 'subject'): string {
  const raw = which === 'issuer' ? cert.issuer : cert.subject;
  // Node prints attributes one per line — join with ", " for RFC-2253-ish form.
  return raw.split('\n').map(s => s.trim()).filter(Boolean).join(', ');
}

function buildAuthTemplate(challenge: string, nip: string): string {
  // Build a XAdES-BES signature template. KSeF rejects plain XML-DSig with
  // exception 9105 ("Format podpisu niezgodny z akceptowanymi profilami XAdES").
  //
  // BES = Basic Electronic Signature: adds <xades:QualifyingProperties> with
  // SigningTime + SigningCertificate (cert hash + issuer/serial). xmlsec1
  // computes the digests of:
  //   1) the document (enveloped signature, c14n) → first ds:Reference
  //   2) the SignedProperties subtree                → second ds:Reference
  // and signs both via the SignedInfo digest.
  const certPem = readFileSync(CERT_PATH, 'utf-8');
  const x509 = new crypto.X509Certificate(certPem);
  const certDer = x509.raw;
  const certDigestB64 = crypto.createHash('sha256').update(certDer).digest('base64');
  const issuerName = dnFromCert(x509, 'issuer');
  // X509Certificate.serialNumber is hex — convert to decimal as required by xmldsig.
  const serialDecimal = BigInt(`0x${x509.serialNumber}`).toString(10);
  const signingTime = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  const ds = 'xmlns:ds="http://www.w3.org/2000/09/xmldsig#"';
  const xades = 'xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"';

  return `<?xml version="1.0" encoding="UTF-8"?>
<AuthTokenRequest xmlns="http://ksef.mf.gov.pl/auth/token/2.0">
  <Challenge>${challenge}</Challenge>
  <ContextIdentifier>
    <Nip>${nip}</Nip>
  </ContextIdentifier>
  <SubjectIdentifierType>certificateSubject</SubjectIdentifierType>
  <ds:Signature ${ds} Id="Sig-1">
    <ds:SignedInfo>
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"/>
      <ds:Reference Id="DocRef" URI="">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
          <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue></ds:DigestValue>
      </ds:Reference>
      <ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#SignedProps">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
        <ds:DigestValue></ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue></ds:SignatureValue>
    <ds:KeyInfo>
      <ds:X509Data>
        <ds:X509Certificate></ds:X509Certificate>
      </ds:X509Data>
    </ds:KeyInfo>
    <ds:Object>
      <xades:QualifyingProperties ${xades} Target="#Sig-1">
        <xades:SignedProperties Id="SignedProps">
          <xades:SignedSignatureProperties>
            <xades:SigningTime>${signingTime}</xades:SigningTime>
            <xades:SigningCertificate>
              <xades:Cert>
                <xades:CertDigest>
                  <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>
                  <ds:DigestValue>${certDigestB64}</ds:DigestValue>
                </xades:CertDigest>
                <xades:IssuerSerial>
                  <ds:X509IssuerName>${escapeXml(issuerName)}</ds:X509IssuerName>
                  <ds:X509SerialNumber>${serialDecimal}</ds:X509SerialNumber>
                </xades:IssuerSerial>
              </xades:Cert>
            </xades:SigningCertificate>
          </xades:SignedSignatureProperties>
        </xades:SignedProperties>
      </xades:QualifyingProperties>
    </ds:Object>
  </ds:Signature>
</AuthTokenRequest>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function signWithXmlsec(): string {
  step(3, 'XAdES-sign AuthTokenRequest');
  // Copy cert to a no-space path — xmlsec1 splits --privkey-pem on commas,
  // and a cert path with spaces confuses both the shell and the cert loader.
  writeFileSync(TMP_CERT_PEM, readFileSync(CERT_PATH), { mode: 0o600 });
  chmodSync(TMP_CERT_PEM, 0o600);

  // --lax-key-search   xmlsec1 1.3+ requires this when KeyInfo references the
  //                    cert via empty placeholders (no KeyName).
  // --id-attr:Id ...   tells xmlsec1 to treat the `Id` attribute on
  //                    xades:SignedProperties as an XML ID so the second
  //                    Reference (URI="#SignedProps") resolves correctly.
  try {
    execFileSync('xmlsec1', [
      '--sign',
      '--lax-key-search',
      '--id-attr:Id', 'http://uri.etsi.org/01903/v1.3.2#:SignedProperties',
      '--privkey-pem', `${TMP_KEY_PEM},${TMP_CERT_PEM}`,
      '--output', TMP_SIGNED,
      TMP_TEMPLATE,
    ], { stdio: ['ignore', 'inherit', 'inherit'] });
  } catch (err) {
    fail(`xmlsec1 sign failed: ${(err as Error).message}`);
  }
  const signed = readFileSync(TMP_SIGNED, 'utf-8');
  console.log(`  ✓ signed XML (${signed.length} bytes) → ${TMP_SIGNED}`);
  return signed;
}

// ── 4) Submit XAdES, poll, redeem ───────────────────────────────────────

interface AuthInitResponse {
  referenceNumber: string;
  authenticationToken: { token: string; validUntil: string };
}

interface AuthStatusResponse {
  status: { code: number; description: string };
  authenticationMethod?: string;
  startDate?: string;
}

interface AuthTokensResponse {
  accessToken: { token: string; validUntil: string };
  refreshToken: { token: string; validUntil: string };
}

async function submitAuth(signedXml: string): Promise<AuthInitResponse> {
  step(4, 'POST /auth/xades-signature');
  const { status, data } = await ksef<AuthInitResponse>('POST', '/auth/xades-signature', {
    body: signedXml,
    headers: { 'Content-Type': 'application/xml' },
  });
  if (status !== 202 && status !== 200) fail(`xades-signature failed: ${pretty(data)}`);
  console.log(`  referenceNumber:    ${data.referenceNumber}`);
  console.log(`  authToken (first 60): ${data.authenticationToken.token.substring(0, 60)}...`);
  return data;
}

async function pollAuth(ref: string, authToken: string): Promise<void> {
  step(5, `Poll /auth/${ref} until status=200`);
  for (let i = 0; i < 15; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { status, data } = await ksef<AuthStatusResponse>('GET', `/auth/${ref}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (status !== 200) fail(`poll failed: ${pretty(data)}`);
    const code = data.status.code;
    console.log(`  attempt ${i + 1}: code=${code} ${data.status.description}`);
    if (code === 200) return;
    if (code >= 400) fail(`auth rejected: ${data.status.description}`);
  }
  fail('auth polling timed out');
}

async function redeemTokens(authToken: string): Promise<AuthTokensResponse> {
  step(6, 'POST /auth/token/redeem');
  const { status, data } = await ksef<AuthTokensResponse>('POST', '/auth/token/redeem', {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (status !== 200) fail(`redeem failed: ${pretty(data)}`);
  console.log(`  accessToken (first 60): ${data.accessToken.token.substring(0, 60)}...`);
  console.log(`  validUntil:             ${data.accessToken.validUntil}`);
  return data;
}

// ── 5) Fetch MoF SymmetricKeyEncryption cert ────────────────────────────

interface PublicKeyCertificate {
  certificate: string;
  validFrom: string;
  validTo: string;
  usage: string[];
}

async function getMoFSymmetricKeyCert(): Promise<crypto.KeyObject> {
  step(7, 'GET /security/public-key-certificates');
  const { status, data } = await ksef<PublicKeyCertificate[]>('GET', '/security/public-key-certificates');
  if (status !== 200) fail(`public-key fetch failed: HTTP ${status}`);
  const cert = data.find(c => c.usage?.includes('SymmetricKeyEncryption'));
  if (!cert) fail('No cert with usage=SymmetricKeyEncryption');
  console.log(`  validFrom: ${cert.validFrom}, validTo: ${cert.validTo}`);
  const pem = `-----BEGIN CERTIFICATE-----\n${cert.certificate.match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----`;
  return crypto.createPublicKey(pem);
}

// ── 6) Open online session ──────────────────────────────────────────────

interface SessionOpenResponse {
  referenceNumber: string;
  validUntil: string;
}

async function openSession(
  accessToken: string,
  pubKey: crypto.KeyObject,
): Promise<{ session: SessionOpenResponse; aesKey: Buffer; aesIv: Buffer }> {
  step(8, 'POST /sessions/online');
  const aesKey = crypto.randomBytes(32);
  const aesIv = crypto.randomBytes(16);

  const wrapped = crypto.publicEncrypt(
    { key: pubKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
    aesKey,
  );

  const { status, data } = await ksef<SessionOpenResponse>('POST', '/sessions/online', {
    headers: { Authorization: `Bearer ${accessToken}` },
    body: {
      formCode: { systemCode: 'FA (3)', schemaVersion: '1-0E', value: 'FA' },
      encryption: {
        encryptedSymmetricKey: wrapped.toString('base64'),
        initializationVector: aesIv.toString('base64'),
      },
    },
  });

  if (status !== 201) fail(`session open failed: ${pretty(data)}`);
  console.log(`  session ref: ${data.referenceNumber}`);
  console.log(`  validUntil:  ${data.validUntil}`);
  return { session: data, aesKey, aesIv };
}

// ── 7) Encrypt invoice + send ───────────────────────────────────────────

async function sendInvoice(
  accessToken: string,
  sessionRef: string,
  aesKey: Buffer,
  aesIv: Buffer,
): Promise<string> {
  step(9, `POST /sessions/online/${sessionRef}/invoices`);
  if (!existsSync(INVOICE_PATH)) fail(`Invoice not found at ${INVOICE_PATH}`);
  const xmlBuf = readFileSync(INVOICE_PATH);

  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, aesIv);
  cipher.setAutoPadding(true); // PKCS#7
  const encrypted = Buffer.concat([cipher.update(xmlBuf), cipher.final()]);

  const invoiceHashB64 = crypto.createHash('sha256').update(xmlBuf).digest('base64');
  const encryptedHashB64 = crypto.createHash('sha256').update(encrypted).digest('base64');

  console.log(`  invoice plaintext: ${xmlBuf.length} bytes / sha256 ${invoiceHashB64}`);
  console.log(`  invoice encrypted: ${encrypted.length} bytes / sha256 ${encryptedHashB64}`);

  const { status, data } = await ksef<{ referenceNumber: string }>(
    'POST',
    `/sessions/online/${sessionRef}/invoices`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        invoiceHash: invoiceHashB64,
        invoiceSize: xmlBuf.length,
        encryptedInvoiceHash: encryptedHashB64,
        encryptedInvoiceSize: encrypted.length,
        encryptedInvoiceContent: encrypted.toString('base64'),
      },
    },
  );

  if (status !== 202 && status !== 200) fail(`invoice send failed: ${pretty(data)}`);
  console.log(`  invoice ref: ${data.referenceNumber}`);
  return data.referenceNumber;
}

// ── 8) Close session and pull UPO ───────────────────────────────────────

async function closeSession(accessToken: string, sessionRef: string) {
  step(10, `POST /sessions/online/${sessionRef}/close`);
  const { status, data } = await ksef('POST', `/sessions/online/${sessionRef}/close`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (status !== 200 && status !== 204 && status !== 202) {
    fail(`close failed: ${pretty(data)}`);
  }
  console.log(`  session closed`);
}

async function pollSessionStatus(accessToken: string, sessionRef: string) {
  step(11, `GET /sessions/${sessionRef} until UPO ready`);
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const { data } = await ksef<{
      status?: { code: number; description: string };
      processingCode?: number;
      processingDescription?: string;
      upo?: string;
      numberOfInvoices?: number;
    }>('GET', `/sessions/${sessionRef}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const code = data.status?.code ?? data.processingCode;
    const desc = data.status?.description ?? data.processingDescription;
    console.log(`  attempt ${i + 1}: code=${code} ${desc} | invoices=${data.numberOfInvoices ?? '?'}`);
    if (code !== undefined && code >= 200 && code < 300 && data.upo) {
      const upoPath = `/tmp/ksef-upo-${sessionRef}.xml`;
      writeFileSync(upoPath, data.upo, 'utf-8');
      console.log(`  ✓ UPO saved to ${upoPath}`);
      return;
    }
    if (code !== undefined && code >= 400) {
      fail(`session error: ${desc}`);
    }
  }
  console.warn('  ⚠️  UPO not ready after 60s — keep polling manually');
}

// ── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (!PASS) {
    console.error(
      'KSEF_KEY_PASSPHRASE not set. Run with:\n' +
      "  KSEF_KEY_PASSPHRASE='your-secret' bun scripts/ksef-demo-send.ts",
    );
    process.exit(2);
  }

  console.log('🔐 KSeF v2 demo end-to-end submission');
  console.log(`   base:    ${BASE_URL}`);
  console.log(`   nip:     ${NIP}`);
  console.log(`   cert:    ${CERT_PATH}`);
  console.log(`   key:     ${KEY_PATH}`);
  console.log(`   invoice: ${INVOICE_PATH}`);

  try {
    decryptKey();
    const challenge = await getChallenge();

    const template = buildAuthTemplate(challenge.challenge, NIP);
    writeFileSync(TMP_TEMPLATE, template, 'utf-8');
    chmodSync(TMP_TEMPLATE, 0o600);

    const signed = signWithXmlsec();
    const init = await submitAuth(signed);
    await pollAuth(init.referenceNumber, init.authenticationToken.token);
    const tokens = await redeemTokens(init.authenticationToken.token);

    const pub = await getMoFSymmetricKeyCert();
    const opened = await openSession(tokens.accessToken.token, pub);
    const invoiceRef = await sendInvoice(
      tokens.accessToken.token,
      opened.session.referenceNumber,
      opened.aesKey,
      opened.aesIv,
    );

    await closeSession(tokens.accessToken.token, opened.session.referenceNumber);
    await pollSessionStatus(tokens.accessToken.token, opened.session.referenceNumber);

    console.log('\n✅ DONE');
    console.log(`   session:  ${opened.session.referenceNumber}`);
    console.log(`   invoice:  ${invoiceRef}`);
    void signed; // keep referenced for clarity
  } finally {
    for (const p of cleanupPaths) {
      try { if (existsSync(p)) rmSync(p); } catch { /* best-effort */ }
    }
  }
}

await main();
