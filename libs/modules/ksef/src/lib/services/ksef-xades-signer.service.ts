import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'node:crypto';

import { KsefEncryptionException } from '../exceptions';

/**
 * XML namespace URIs we hard-code into the AuthTokenRequest signature.
 *
 * These must match exactly what KSeF's XAdES validator expects — the values
 * are part of the protocol contract, not a configuration knob.
 */
const KSEF_AUTH_NS = 'http://ksef.mf.gov.pl/auth/token/2.0';
const DS_NS = 'http://www.w3.org/2000/09/xmldsig#';
const XADES_NS = 'http://uri.etsi.org/01903/v1.3.2#';

/** Algorithm identifiers used inside the Signature element (per W3C xmldsig). */
const C14N_ALGO = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const ENVELOPED_SIG_ALGO = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';
const SHA256_DIGEST_ALGO = 'http://www.w3.org/2001/04/xmlenc#sha256';
const RSA_SHA256_ALGO = 'http://www.w3.org/2000/09/xmldsig#rsa-sha256';
const ECDSA_SHA256_ALGO = 'http://www.w3.org/2001/04/xmldsig-more#ecdsa-sha256';
const SIGNED_PROPS_TYPE = 'http://uri.etsi.org/01903#SignedProperties';

export interface XadesSignInput {
  /** Challenge string returned by `POST /auth/challenge`. */
  challenge: string;
  /** NIP we want KSeF to authorise (the seller / context). */
  nip: string;
  /** PEM-encoded X.509 certificate to embed in the signature. */
  certificatePem: string;
  /** Already-decrypted private key matching `certificatePem`. */
  privateKey: crypto.KeyObject;
  /**
   * Override the signing time stamped into `<xades:SigningTime>`.
   * Default is `new Date()`. Tests pass a fixed timestamp so the signed
   * output is deterministic and snapshot-comparable.
   */
  signingTime?: Date;
}

/**
 * Generates an XAdES-BES signed `<AuthTokenRequest>` for KSeF v2 XAdES auth.
 *
 * Why we wrote a hand-rolled signer instead of pulling in `xml-crypto`:
 *   1. xml-crypto doesn't natively understand XAdES — we'd be using it as a
 *      DSig primitive AND still hand-rolling the QualifyingProperties on
 *      top, which is more code, not less.
 *   2. The AuthTokenRequest body is fully under our control, and a few hand-
 *      written lines of XML in c14n-output form are easier to reason about
 *      than a third-party DOM round-trip.
 *   3. Production demo run (8191654690-20260428-A846E0000000-A3) confirmed
 *      KSeF accepts this exact profile; the spec and reference impl are
 *      stable, so the maintenance risk of avoiding the dep is near zero.
 *
 * Implementation strategy: build every signable subtree directly in c14n
 * inclusive form (no inter-element whitespace; namespace declarations
 * pre-positioned where c14n on a subtree would put them anyway). That lets
 * us compute digests with simple `sha256(buffer)` calls instead of running
 * a c14n implementation on a parsed DOM.
 *
 * Flow:
 *   1. Compute cert metadata (DER digest, issuer DN, decimal serial).
 *   2. Build `<xades:SignedProperties>` body — this is fixed up-front.
 *   3. Compute SignedProperties digest from its c14n form (with `xmlns:ds`
 *      and `xmlns:xades` propagated to the subtree root).
 *   4. Build the SignedInfo, parameterised on the *Document* digest (TBD)
 *      and the SignedProperties digest (known).
 *   5. Compute the Document digest from the c14n of the AuthTokenRequest
 *      *body* — that is, the document with the entire `<ds:Signature>`
 *      element removed (the enveloped-signature transform).
 *   6. Re-emit SignedInfo with both digests filled in. C14n it (prepend
 *      `xmlns:ds` to the root). Sign that with the user's private key.
 *   7. Convert ECDSA DER → IEEE P1363 (xmldsig requires raw r||s, not DER).
 *   8. Assemble the final XML and return.
 */
@Injectable()
export class KsefXadesSignerService {
  private readonly logger = new Logger(KsefXadesSignerService.name);

  signAuthTokenRequest(input: XadesSignInput): string {
    const cert = new crypto.X509Certificate(input.certificatePem);
    const certDer = cert.raw;
    const certDigestB64 = crypto.createHash('sha256').update(certDer).digest('base64');
    const certB64 = certDer.toString('base64');
    const issuerName = this.flattenDn(cert.issuer);
    // Node's X509Certificate exposes the serial as a hex string. xmldsig
    // requires it in decimal (per RFC 5280 + ETSI TS 101 903).
    const serialDecimal = BigInt(`0x${cert.serialNumber}`).toString(10);
    const signingTime = (input.signingTime ?? new Date())
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');

    const { signatureMethodAlgo, isEc } = this.resolveSignatureAlgorithm(input.privateKey);

    // Step 1 — SignedProperties body (used both inside the template AND for
    //          its own digest; we serialise it once in c14n form so the
    //          digest is just `sha256(rootWithPropagatedNs)`).
    const signedPropsBodyXml = this.buildSignedPropertiesXml({
      signingTime,
      certDigestB64,
      issuerName,
      serialDecimal,
    });
    const signedPropsForC14n = this.subtreeForC14n(
      signedPropsBodyXml,
      'xades:SignedProperties',
      // Inclusive c14n on a subtree adds **all in-scope** ancestor namespace
      // declarations to the subtree root, sorted by prefix (default ns first,
      // then alphabetical) per the spec — NOT just the visibly-utilized ones.
      // For SignedProperties, the in-scope namespaces are:
      //   - default `xmlns="http://ksef.mf.gov.pl/auth/token/2.0"` from the
      //     AuthTokenRequest grand-grand-grand-parent
      //   - `xmlns:ds="..."` from the Signature ancestor
      //   - `xmlns:xades="..."` from the QualifyingProperties parent
      // KSeF demo proves it: omitting the default xmlns produced a different
      // hash and demo rejected with 9105 ("Nieprawidłowa wartość skrótu dla
      // referencji wskazującej na element '#SignedProps'").
      [
        { prefix: '', uri: KSEF_AUTH_NS },
        { prefix: 'ds', uri: DS_NS },
        { prefix: 'xades', uri: XADES_NS },
      ],
    );
    const signedPropsDigestB64 = crypto
      .createHash('sha256')
      .update(signedPropsForC14n, 'utf-8')
      .digest('base64');

    // Step 2 — Document Reference digest (enveloped-signature transform).
    //
    // Because the entire <ds:Signature> subtree is removed by the transform,
    // the c14n input is exactly the AuthTokenRequest body without the
    // signature — which we can build directly without ever generating a
    // version of the document that includes the signature.
    const documentBodyForC14n = this.buildDocumentBodyForC14n({
      challenge: input.challenge,
      nip: input.nip,
    });
    const documentDigestB64 = crypto
      .createHash('sha256')
      .update(documentBodyForC14n, 'utf-8')
      .digest('base64');

    // Step 3 — Build the SignedInfo, c14n it, and sign.
    const signedInfoForC14n = this.buildSignedInfoXmlForC14n({
      signatureMethodAlgo,
      docDigestB64: documentDigestB64,
      signedPropsDigestB64,
    });
    const signedInfoBytes = Buffer.from(signedInfoForC14n, 'utf-8');

    let signature: Buffer;
    try {
      signature = crypto.sign('SHA256', signedInfoBytes, input.privateKey);
    } catch (error) {
      throw new KsefEncryptionException(
        `Nie udało się podpisać żądania uwierzytelnienia XAdES: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    if (isEc) {
      signature = this.derEcdsaToP1363(signature, this.ecComponentLength(input.privateKey));
    }
    const signatureValueB64 = signature.toString('base64');

    // Step 4 — Render the final XML in the same c14n form the digests were
    //          computed against. Note the SignedInfo embedded here does NOT
    //          declare xmlns:ds (it's in scope from the parent <ds:Signature>),
    //          but the bytes we *signed* in step 3 DO include it because
    //          inclusive c14n on the SignedInfo subtree adds it. Both forms
    //          parse to the same DOM, so KSeF's canonicalisation on receipt
    //          reproduces the bytes we signed.
    const signedInfoForTemplate = this.buildSignedInfoXmlForTemplate({
      signatureMethodAlgo,
      docDigestB64: documentDigestB64,
      signedPropsDigestB64,
    });

    return this.buildFullSignedXml({
      challenge: input.challenge,
      nip: input.nip,
      signedInfoForTemplate,
      signatureValueB64,
      certB64,
      signedPropsBodyXml,
    });
  }

  // ── Subtree builders ────────────────────────────────────────────────────

  /**
   * Build the body of the AuthTokenRequest *as if* the signature had already
   * been removed by the enveloped-signature transform. This is the input
   * the Document Reference digest is computed over.
   *
   * Joined with no whitespace so the bytes ARE the c14n inclusive output
   * (no normalisation needed). KSeF will recompute c14n on its end after
   * parsing the full signed document; both arrive at the same bytes.
   */
  private buildDocumentBodyForC14n(parts: { challenge: string; nip: string }): string {
    return [
      `<AuthTokenRequest xmlns="${KSEF_AUTH_NS}">`,
      `<Challenge>${this.escapeTextContent(parts.challenge)}</Challenge>`,
      `<ContextIdentifier><Nip>${this.escapeTextContent(parts.nip)}</Nip></ContextIdentifier>`,
      `<SubjectIdentifierType>certificateSubject</SubjectIdentifierType>`,
      `</AuthTokenRequest>`,
    ].join('');
  }

  private buildSignedPropertiesXml(parts: {
    signingTime: string;
    certDigestB64: string;
    issuerName: string;
    serialDecimal: string;
  }): string {
    return [
      `<xades:SignedProperties Id="SignedProps">`,
      `<xades:SignedSignatureProperties>`,
      `<xades:SigningTime>${this.escapeTextContent(parts.signingTime)}</xades:SigningTime>`,
      `<xades:SigningCertificate>`,
      `<xades:Cert>`,
      `<xades:CertDigest>`,
      `<ds:DigestMethod Algorithm="${SHA256_DIGEST_ALGO}"></ds:DigestMethod>`,
      `<ds:DigestValue>${parts.certDigestB64}</ds:DigestValue>`,
      `</xades:CertDigest>`,
      `<xades:IssuerSerial>`,
      `<ds:X509IssuerName>${this.escapeTextContent(parts.issuerName)}</ds:X509IssuerName>`,
      `<ds:X509SerialNumber>${parts.serialDecimal}</ds:X509SerialNumber>`,
      `</xades:IssuerSerial>`,
      `</xades:Cert>`,
      `</xades:SigningCertificate>`,
      `</xades:SignedSignatureProperties>`,
      `</xades:SignedProperties>`,
    ].join('');
  }

  /**
   * SignedInfo as-it-appears-when-c14n'd-as-a-subtree.
   *
   * Inclusive c14n on a subtree propagates **all in-scope** ancestor
   * namespace declarations to the subtree root, sorted by prefix (default
   * ns first, then alphabetical) — not only the visibly-utilized ones.
   *
   * For SignedInfo the in-scope namespaces are:
   *   - default `xmlns="http://ksef.mf.gov.pl/auth/token/2.0"` from
   *     AuthTokenRequest
   *   - `xmlns:ds="..."` from the parent Signature element
   *
   * (The `xades` prefix is in scope further down via the QualifyingProperties
   * sibling but it's NOT in SignedInfo's ancestor chain, so it's not
   * propagated here.)
   */
  private buildSignedInfoXmlForC14n(parts: {
    signatureMethodAlgo: string;
    docDigestB64: string;
    signedPropsDigestB64: string;
  }): string {
    return [
      `<ds:SignedInfo xmlns="${KSEF_AUTH_NS}" xmlns:ds="${DS_NS}">`,
      `<ds:CanonicalizationMethod Algorithm="${C14N_ALGO}"></ds:CanonicalizationMethod>`,
      `<ds:SignatureMethod Algorithm="${parts.signatureMethodAlgo}"></ds:SignatureMethod>`,
      `<ds:Reference Id="DocRef" URI="">`,
      `<ds:Transforms>`,
      `<ds:Transform Algorithm="${ENVELOPED_SIG_ALGO}"></ds:Transform>`,
      `<ds:Transform Algorithm="${C14N_ALGO}"></ds:Transform>`,
      `</ds:Transforms>`,
      `<ds:DigestMethod Algorithm="${SHA256_DIGEST_ALGO}"></ds:DigestMethod>`,
      `<ds:DigestValue>${parts.docDigestB64}</ds:DigestValue>`,
      `</ds:Reference>`,
      `<ds:Reference Type="${SIGNED_PROPS_TYPE}" URI="#SignedProps">`,
      `<ds:Transforms>`,
      `<ds:Transform Algorithm="${C14N_ALGO}"></ds:Transform>`,
      `</ds:Transforms>`,
      `<ds:DigestMethod Algorithm="${SHA256_DIGEST_ALGO}"></ds:DigestMethod>`,
      `<ds:DigestValue>${parts.signedPropsDigestB64}</ds:DigestValue>`,
      `</ds:Reference>`,
      `</ds:SignedInfo>`,
    ].join('');
  }

  /**
   * SignedInfo as-it-appears-inside-the-final-document. Does NOT include
   * `xmlns:ds` on the SignedInfo element because the prefix is already in
   * scope from the wrapping `<ds:Signature xmlns:ds="...">` — the redundant
   * declaration would still parse to the same DOM, but emitting it on the
   * wire is wasteful.
   */
  private buildSignedInfoXmlForTemplate(parts: {
    signatureMethodAlgo: string;
    docDigestB64: string;
    signedPropsDigestB64: string;
  }): string {
    return [
      `<ds:SignedInfo>`,
      `<ds:CanonicalizationMethod Algorithm="${C14N_ALGO}"></ds:CanonicalizationMethod>`,
      `<ds:SignatureMethod Algorithm="${parts.signatureMethodAlgo}"></ds:SignatureMethod>`,
      `<ds:Reference Id="DocRef" URI="">`,
      `<ds:Transforms>`,
      `<ds:Transform Algorithm="${ENVELOPED_SIG_ALGO}"></ds:Transform>`,
      `<ds:Transform Algorithm="${C14N_ALGO}"></ds:Transform>`,
      `</ds:Transforms>`,
      `<ds:DigestMethod Algorithm="${SHA256_DIGEST_ALGO}"></ds:DigestMethod>`,
      `<ds:DigestValue>${parts.docDigestB64}</ds:DigestValue>`,
      `</ds:Reference>`,
      `<ds:Reference Type="${SIGNED_PROPS_TYPE}" URI="#SignedProps">`,
      `<ds:Transforms>`,
      `<ds:Transform Algorithm="${C14N_ALGO}"></ds:Transform>`,
      `</ds:Transforms>`,
      `<ds:DigestMethod Algorithm="${SHA256_DIGEST_ALGO}"></ds:DigestMethod>`,
      `<ds:DigestValue>${parts.signedPropsDigestB64}</ds:DigestValue>`,
      `</ds:Reference>`,
      `</ds:SignedInfo>`,
    ].join('');
  }

  /**
   * Final, fully-signed AuthTokenRequest. Includes the XML declaration so
   * KSeF's HTTP layer accepts it as `application/xml`.
   */
  private buildFullSignedXml(parts: {
    challenge: string;
    nip: string;
    signedInfoForTemplate: string;
    signatureValueB64: string;
    certB64: string;
    signedPropsBodyXml: string;
  }): string {
    return [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<AuthTokenRequest xmlns="${KSEF_AUTH_NS}">`,
      `<Challenge>${this.escapeTextContent(parts.challenge)}</Challenge>`,
      `<ContextIdentifier><Nip>${this.escapeTextContent(parts.nip)}</Nip></ContextIdentifier>`,
      `<SubjectIdentifierType>certificateSubject</SubjectIdentifierType>`,
      `<ds:Signature xmlns:ds="${DS_NS}" Id="Sig-1">`,
      parts.signedInfoForTemplate,
      `<ds:SignatureValue>${parts.signatureValueB64}</ds:SignatureValue>`,
      `<ds:KeyInfo>`,
      `<ds:X509Data>`,
      `<ds:X509Certificate>${parts.certB64}</ds:X509Certificate>`,
      `</ds:X509Data>`,
      `</ds:KeyInfo>`,
      `<ds:Object>`,
      `<xades:QualifyingProperties xmlns:xades="${XADES_NS}" Target="#Sig-1">`,
      parts.signedPropsBodyXml,
      `</xades:QualifyingProperties>`,
      `</ds:Object>`,
      `</ds:Signature>`,
      `</AuthTokenRequest>`,
    ].join('');
  }

  // ── C14n helper ─────────────────────────────────────────────────────────

  /**
   * Add the in-scope namespace declarations a c14n implementation would
   * emit on the root of the extracted subtree.
   *
   * For our well-known templates this is just a string substitution: we
   * locate the subtree's opening tag and insert the namespace decls right
   * after the element name.
   *
   * Namespace decls are sorted by prefix (default namespace first, then
   * alphabetical) per the inclusive c14n spec.
   */
  private subtreeForC14n(
    subtreeXml: string,
    rootQualifiedName: string,
    namespaces: Array<{ prefix: string; uri: string }>,
  ): string {
    // Sort namespaces by prefix (default ns first, then alphabetical).
    const sorted = [...namespaces].sort((a, b) => {
      if (a.prefix === '' && b.prefix !== '') return -1;
      if (a.prefix !== '' && b.prefix === '') return 1;
      return a.prefix.localeCompare(b.prefix);
    });
    const nsDecls = sorted
      .map(({ prefix, uri }) =>
        prefix === '' ? ` xmlns="${uri}"` : ` xmlns:${prefix}="${uri}"`,
      )
      .join('');

    const openTagPrefix = `<${rootQualifiedName}`;
    const idx = subtreeXml.indexOf(openTagPrefix);
    if (idx !== 0) {
      throw new KsefEncryptionException(
        `XAdES c14n: subtree did not start with <${rootQualifiedName} (got "${subtreeXml.substring(
          0,
          80,
        )}…")`,
      );
    }
    // Insert namespace decls right after the opening element name.
    return (
      subtreeXml.substring(0, openTagPrefix.length) +
      nsDecls +
      subtreeXml.substring(openTagPrefix.length)
    );
  }

  // ── Crypto helpers ──────────────────────────────────────────────────────

  private resolveSignatureAlgorithm(privateKey: crypto.KeyObject): {
    signatureMethodAlgo: string;
    isEc: boolean;
  } {
    const keyType = privateKey.asymmetricKeyType;
    if (keyType === 'ec') {
      return { signatureMethodAlgo: ECDSA_SHA256_ALGO, isEc: true };
    }
    if (keyType === 'rsa' || keyType === 'rsa-pss') {
      return { signatureMethodAlgo: RSA_SHA256_ALGO, isEc: false };
    }
    throw new KsefEncryptionException(
      `Nieobsługiwany typ klucza dla podpisu XAdES: ${keyType ?? 'unknown'}. Wymagany: RSA lub EC.`,
    );
  }

  private ecComponentLength(privateKey: crypto.KeyObject): number {
    const jwk = privateKey.export({ format: 'jwk' });
    const curve = jwk.crv;
    switch (curve) {
      case 'P-256':
        return 32;
      case 'P-384':
        return 48;
      case 'P-521':
        // 521 bits → 66 bytes (528 / 8 = 66).
        return 66;
      default:
        throw new KsefEncryptionException(
          `Nieobsługiwana krzywa EC dla podpisu XAdES: ${curve ?? 'unknown'}.`,
        );
    }
  }

  /**
   * Convert Node's DER-encoded ECDSA signature into the IEEE P1363 form
   * required by xmldsig: raw `r || s`, each component left-padded to the
   * curve's component length.
   *
   * DER layout: `0x30 [seqLen] 0x02 [rLen] [r] 0x02 [sLen] [s]`. For ECDSA
   * sequence lengths fit in one byte for all standard curves (P-256/384/521),
   * but we still handle the long-form length encoding defensively in case a
   * future curve needs it.
   */
  private derEcdsaToP1363(der: Buffer, componentLength: number): Buffer {
    if (der.length < 8 || der[0] !== 0x30) {
      throw new KsefEncryptionException('XAdES ECDSA: nieprawidłowa struktura DER (brak SEQUENCE).');
    }
    let cursor = 2;
    if ((der[1] & 0x80) !== 0) {
      const lengthLengthBytes = der[1] & 0x7f;
      cursor = 2 + lengthLengthBytes;
    }

    const readInteger = (): Buffer => {
      if (der[cursor] !== 0x02) {
        throw new KsefEncryptionException('XAdES ECDSA: oczekiwano INTEGER w sekwencji DER.');
      }
      const len = der[cursor + 1];
      let value = der.subarray(cursor + 2, cursor + 2 + len);
      cursor += 2 + len;
      // DER prepends a 0x00 byte to keep positive numbers from being read
      // as negative; strip it before re-padding.
      if (value.length > componentLength && value[0] === 0x00) {
        value = value.subarray(1);
      }
      if (value.length > componentLength) {
        throw new KsefEncryptionException(
          `XAdES ECDSA: komponent (${value.length}B) jest dłuższy niż długość krzywej (${componentLength}B).`,
        );
      }
      return value;
    };

    const r = readInteger();
    const s = readInteger();

    const out = Buffer.alloc(componentLength * 2);
    r.copy(out, componentLength - r.length);
    s.copy(out, componentLength * 2 - s.length);
    return out;
  }

  // ── Misc helpers ────────────────────────────────────────────────────────

  /**
   * Flatten Node's multi-line cert subject/issuer DN into a single RFC-2253
   * string. Node 18+ returns one attribute per line; KSeF accepts the
   * concatenated form (it's used as a lookup key, not for crypto).
   */
  private flattenDn(rawDn: string): string {
    return rawDn
      .split('\n')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ');
  }

  /**
   * Escape XML metacharacters in **element text content** per the inclusive
   * c14n spec (section 1.5 of W3C xml-c14n-20010315):
   *   - `&`  → `&amp;`
   *   - `<`  → `&lt;`
   *   - `>`  → `&gt;`
   *   - `\r` → `&#xD;`
   *
   * Notably we do NOT escape `'` or `"` here — they are NOT metacharacters
   * inside text content. Escaping them would force KSeF to compute a
   * different c14n on receive (it would canonicalise `&apos;` back to `'`)
   * and the signature would fail with 9105. KSeF demo / prod cert DNs are
   * ASCII-only in practice, so this only matters as a defence-in-depth
   * measure — but the bug is real, so we fix it.
   *
   * Inputs reaching this function:
   *   - the user's challenge / NIP — controlled values from KSeF
   *   - the cert's issuer DN       — could in theory contain `'` or `"`
   *   - the signing time           — ISO 8601 (no special chars)
   */
  private escapeTextContent(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r/g, '&#xD;');
  }
}
