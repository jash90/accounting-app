/**
 * Source-of-truth map: KSeF API status code → Polish user-facing message.
 *
 * Codes are taken from the KSeF v2 OpenAPI spec (status object on session,
 * invoice and authentication responses; `exceptionCode` on synchronous error
 * payloads). When KSeF returns a code we recognize, we surface the mapped
 * message instead of the raw English/internal description so end users see a
 * consistent Polish error in `KsefApiException`, the audit log, and the
 * per-invoice `validationErrors` payload.
 *
 * Categories covered:
 *   - 1xx — informational (processing, in-progress)
 *   - 2xx — success
 *   - 4xx (HTTP-aligned) — invoice/session level failures (415, 440, 445, etc.)
 *   - 9xxx — XAdES signature / format errors (9105 etc.)
 *   - 21xxx — authentication failures (21111, 21115, 21117, 21301)
 *
 * If you encounter a new code in production, add it here rather than building
 * one-off translations at the call site.
 */
export const KSEF_ERROR_CODES: Record<number, string> = {
  // ── 1xx — Informational ────────────────────────────────────────────────
  100: 'Operacja przyjęta do dalszego przetwarzania',
  150: 'Trwa przetwarzanie',
  170: 'Sesja interaktywna zamknięta',

  // ── 2xx — Success ──────────────────────────────────────────────────────
  200: 'Sukces',

  // ── 4xx — Invoice / session level errors ───────────────────────────────
  405: 'Przetwarzanie anulowane z powodu błędu sesji',
  410: 'Nieprawidłowy zakres uprawnień',
  415: 'Błąd odszyfrowania dostarczonego klucza',
  420: 'Przekroczony limit faktur w sesji',
  430: 'Błąd weryfikacji pliku faktury',
  435: 'Błąd odszyfrowania pliku',
  440: 'Duplikat faktury',
  445: 'Błąd weryfikacji — brak poprawnych faktur w sesji',
  450: 'Błąd weryfikacji semantyki dokumentu faktury',
  500: 'Nieznany błąd po stronie KSeF',
  550: 'Operacja została anulowana przez system. Spróbuj ponownie.',

  // ── 9xxx — Signature / XAdES profile errors ────────────────────────────
  9100: 'Nieprawidłowy podpis cyfrowy dokumentu',
  9105: 'Format podpisu niezgodny z akceptowanymi profilami XAdES-BES',
  9110: 'Nieprawidłowy element SignedInfo w podpisie',
  9115: 'Nieprawidłowy element SignedProperties w podpisie',

  // ── 21xxx — Authentication errors ──────────────────────────────────────
  21111: 'Nieprawidłowy lub wygasły challenge uwierzytelniający',
  21115: 'Nieprawidłowy certyfikat klienta',
  21117: 'Brak uprawnień do wskazanego kontekstu (NIP)',
  21301: 'Uwierzytelnienie wygasło lub zostało cofnięte',

  // ── 5xxx — Server-side fault tolerance ─────────────────────────────────
  5000: 'Wewnętrzny błąd serwera KSeF',
  5001: 'Usługa KSeF chwilowo niedostępna',
};

/**
 * Resolve a Polish user-facing message for a KSeF status / exception code.
 *
 * - When the code is in the known map, returns the mapped Polish message.
 * - When the code is unknown but a `fallback` is provided, returns the
 *   fallback (typically the raw KSeF description so we don't lose detail).
 * - Otherwise returns a generic "unknown KSeF error" message including the
 *   numeric code so support can correlate with KSeF logs.
 */
export function getKsefErrorMessage(
  code: number | null | undefined,
  fallback?: string | null,
): string {
  if (code != null) {
    const mapped = KSEF_ERROR_CODES[code];
    if (mapped) {
      return fallback ? `${mapped} (KSeF ${code}: ${fallback})` : `${mapped} (KSeF ${code})`;
    }
  }
  if (fallback) {
    return code != null ? `KSeF ${code}: ${fallback}` : fallback;
  }
  return code != null ? `Nieznany błąd KSeF (kod ${code})` : 'Nieznany błąd KSeF';
}
