import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import * as crypto from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DOMParser } from '@xmldom/xmldom';

import { KsefXadesSignerService } from '../ksef-xades-signer.service';

/**
 * Round-trip tests for the XAdES-BES signer.
 *
 * The signer is the highest-risk piece in the KSeF integration: a single
 * c14n bug there means KSeF rejects every auth attempt with 9105 ("Format
 * podpisu niezgodny"). The reference implementation (xmlsec1 in
 * `scripts/ksef-demo-send.ts`) is byte-verified against KSeF demo, so
 * these tests focus on locking in:
 *
 *   1. Structural correctness of the produced XML
 *   2. The two DigestValues in `<ds:SignedInfo>` are valid base64 SHA-256
 *   3. The SignatureValue verifies against the embedded cert (the cheapest
 *      test that actually exercises c14n correctness end-to-end).
 *
 * Test fixtures: a fresh self-signed P-256 cert generated with the system
 * `openssl` binary in `beforeAll`. Tests don't need a CA-issued cert
 * because we only verify the signature against the cert we just embedded.
 */
describe('KsefXadesSignerService', () => {
  let service: KsefXadesSignerService;
  let certPem: string;
  let privateKey: crypto.KeyObject;
  let publicKey: crypto.KeyObject;
  let tmp: string;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ksef-xades-test-'));
    const keyPath = join(tmp, 'key.pem');
    const certPath = join(tmp, 'cert.pem');

    // P-256 ECDSA cert. `-nodes` skips PKCS#8 encryption — the signer
    // expects an already-decrypted KeyObject, so the test starts there too.
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'ec',
        '-pkeyopt',
        'ec_paramgen_curve:P-256',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-nodes',
        '-subj',
        '/CN=KSeF Test/O=Test Org/C=PL',
      ],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    );

    certPem = readFileSync(certPath, 'utf-8');
    privateKey = crypto.createPrivateKey(readFileSync(keyPath, 'utf-8'));
    publicKey = crypto.createPublicKey(certPem);

    service = new KsefXadesSignerService();
  });

  afterAll(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('emits a well-formed AuthTokenRequest with all XAdES-BES nodes populated', () => {
    const xml = service.signAuthTokenRequest({
      challenge: 'demo-challenge-abc123',
      nip: '8191654690',
      certificatePem: certPem,
      privateKey,
      signingTime: new Date('2026-04-29T12:34:56.000Z'),
    });

    // Parse defensively — KSeF parses with a real validator before
    // canonicalising, so any well-formedness bug here would surface as a
    // mysterious 9100 from the demo environment.
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.documentElement.localName).toBe('AuthTokenRequest');

    // Required structural elements
    expect(xml).toContain('<Challenge>demo-challenge-abc123</Challenge>');
    expect(xml).toContain('<Nip>8191654690</Nip>');
    expect(xml).toContain('<SubjectIdentifierType>certificateSubject</SubjectIdentifierType>');
    expect(xml).toContain('<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Sig-1">');
    expect(xml).toContain('<xades:SignedProperties Id="SignedProps">');
    expect(xml).toContain('<xades:SigningTime>2026-04-29T12:34:56Z</xades:SigningTime>');

    // SignatureMethod must reflect the key type (P-256 → ecdsa-sha256)
    expect(xml).toContain(
      'SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256"',
    );
  });

  it('embeds the same cert it was given (DER base64 inside X509Certificate)', () => {
    const xml = service.signAuthTokenRequest({
      challenge: 'c',
      nip: '8191654690',
      certificatePem: certPem,
      privateKey,
    });

    const expectedDerB64 = new crypto.X509Certificate(certPem).raw.toString('base64');
    expect(xml).toContain(`<ds:X509Certificate>${expectedDerB64}</ds:X509Certificate>`);
  });

  it('refuses unsupported key types', () => {
    // crypto.generateKeyPairSync('ed25519', ...) gives us a key Node accepts
    // but our SignatureMethod map doesn't.
    const { privateKey: ed25519Key } = crypto.generateKeyPairSync('ed25519');

    expect(() =>
      service.signAuthTokenRequest({
        challenge: 'c',
        nip: '8191654690',
        certificatePem: certPem,
        privateKey: ed25519Key,
      }),
    ).toThrow(/Nieobsługiwany typ klucza/);
  });

  it('signature verifies against the embedded certificate (full end-to-end c14n check)', () => {
    const xml = service.signAuthTokenRequest({
      challenge: 'verify-me',
      nip: '8191654690',
      certificatePem: certPem,
      privateKey,
      signingTime: new Date('2026-04-29T12:34:56.000Z'),
    });

    // Re-derive what we would have signed: extract the SignedInfo subtree
    // from the produced XML and apply the same c14n the signer used.
    // Inclusive c14n propagates **all in-scope** ancestor namespace
    // declarations to the subtree root — for SignedInfo that's the default
    // `xmlns="http://ksef.mf.gov.pl/auth/token/2.0"` (from AuthTokenRequest)
    // plus `xmlns:ds="..."` (from the Signature parent).
    const signedInfoSubtree = extractSubtree(xml, 'ds:SignedInfo');
    const signedInfoForC14n = signedInfoSubtree.replace(
      '<ds:SignedInfo>',
      '<ds:SignedInfo xmlns="http://ksef.mf.gov.pl/auth/token/2.0" xmlns:ds="http://www.w3.org/2000/09/xmldsig#">',
    );
    const signedInfoBytes = Buffer.from(signedInfoForC14n, 'utf-8');

    // Pull out the SignatureValue (base64 of P1363-encoded ECDSA r||s)
    const sigMatch = xml.match(/<ds:SignatureValue>([^<]+)<\/ds:SignatureValue>/);
    expect(sigMatch).not.toBeNull();
    const p1363 = Buffer.from(sigMatch![1], 'base64');
    expect(p1363.length).toBe(64); // P-256 → 32-byte r + 32-byte s

    // crypto.verify expects DER for EC; convert P1363 → DER.
    const der = p1363ToDerEcdsa(p1363);
    const ok = crypto.verify('SHA256', signedInfoBytes, publicKey, der);
    expect(ok).toBe(true);
  });

  it('SignedProperties DigestValue matches sha256 of the c14n subtree', () => {
    const xml = service.signAuthTokenRequest({
      challenge: 'sp-digest-check',
      nip: '8191654690',
      certificatePem: certPem,
      privateKey,
      signingTime: new Date('2026-04-29T12:34:56.000Z'),
    });

    const signedPropsSubtree = extractSubtree(xml, 'xades:SignedProperties');
    // C14n inclusive on the subtree adds **all in-scope** ancestor
    // namespaces to the root, sorted by prefix (default ns first, then
    // alphabetical). The default `xmlns="http://ksef.mf.gov.pl/auth/token/2.0"`
    // is the bug we fixed — KSeF demo rejected with 9105 when we omitted it.
    const c14n = signedPropsSubtree.replace(
      '<xades:SignedProperties Id="SignedProps">',
      '<xades:SignedProperties xmlns="http://ksef.mf.gov.pl/auth/token/2.0" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Id="SignedProps">',
    );
    const expected = crypto.createHash('sha256').update(c14n, 'utf-8').digest('base64');

    // Pull the SECOND DigestValue (the SignedProperties Reference) — the
    // first one belongs to the document Reference.
    const digests = [...xml.matchAll(/<ds:DigestValue>([^<]+)<\/ds:DigestValue>/g)];
    expect(digests.length).toBeGreaterThanOrEqual(3);
    // The order in our template: certDigest (CertDigest), docDigest (DocRef), signedPropsDigest (SignedProps Reference)
    // ...but the SignedInfo's References come BEFORE the SignedProperties body in the XML, so:
    //   index 0 → DocRef DigestValue
    //   index 1 → SignedProperties Reference DigestValue
    //   index 2 → CertDigest DigestValue (inside SignedProperties)
    expect(digests[1][1]).toBe(expected);
  });
});

/**
 * Find the substring `<tag>...</tag>` (first occurrence). Naive but
 * sufficient because our test inputs are tightly controlled and the tag
 * names are unique per template.
 */
function extractSubtree(xml: string, qualifiedName: string): string {
  const open = xml.indexOf(`<${qualifiedName}`);
  if (open < 0) throw new Error(`extractSubtree: <${qualifiedName} not found`);
  // The opening tag may carry attributes — find its terminating `>`.
  const openEnd = xml.indexOf('>', open);
  if (openEnd < 0) throw new Error(`extractSubtree: malformed <${qualifiedName}>`);
  const closeIdx = xml.indexOf(`</${qualifiedName}>`, openEnd);
  if (closeIdx < 0) throw new Error(`extractSubtree: </${qualifiedName}> not found`);
  return xml.substring(open, closeIdx + `</${qualifiedName}>`.length);
}

/**
 * IEEE P1363 → DER ECDSA signature. Inverse of the conversion the signer
 * does internally; needed because Node's `crypto.verify` for EC keys
 * accepts DER form.
 */
function p1363ToDerEcdsa(p1363: Buffer): Buffer {
  const halfLen = p1363.length / 2;
  const r = stripLeadingZeros(p1363.subarray(0, halfLen));
  const s = stripLeadingZeros(p1363.subarray(halfLen));
  const rBody = needsLeadingZero(r) ? Buffer.concat([Buffer.from([0x00]), r]) : r;
  const sBody = needsLeadingZero(s) ? Buffer.concat([Buffer.from([0x00]), s]) : s;
  const seq = Buffer.concat([
    Buffer.from([0x02, rBody.length]),
    rBody,
    Buffer.from([0x02, sBody.length]),
    sBody,
  ]);
  return Buffer.concat([Buffer.from([0x30, seq.length]), seq]);
}

function stripLeadingZeros(buf: Buffer): Buffer {
  let i = 0;
  while (i < buf.length - 1 && buf[i] === 0x00) i++;
  return buf.subarray(i);
}

function needsLeadingZero(buf: Buffer): boolean {
  return buf.length > 0 && (buf[0] & 0x80) !== 0;
}
