const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

/**
 * Validate a Polish NIP (Numer Identyfikacji Podatkowej).
 * Returns true only for a valid 10-digit NIP with correct modulo-11 checksum.
 */
export function isValidPolishNip(nip: string | null | undefined): boolean {
  if (!nip || !/^\d{10}$/.test(nip)) return false;
  const checksum = NIP_WEIGHTS.reduce((sum, w, i) => sum + w * parseInt(nip[i], 10), 0) % 11;
  return checksum === parseInt(nip[9], 10);
}
