import { getKsefErrorMessage, KSEF_ERROR_CODES } from '../ksef-error-codes';

describe('KSEF_ERROR_CODES + getKsefErrorMessage', () => {
  it('exposes a non-empty Polish message for every well-known code', () => {
    // Codes that show up in production diagnostics and must always have a
    // user-facing translation. Adding a code to KSEF_ERROR_CODES without a
    // message would silently fail this test — that's the point.
    const requiredCodes = [415, 440, 445, 9105, 21111, 21115, 21117, 21301];
    for (const code of requiredCodes) {
      const message = KSEF_ERROR_CODES[code];
      expect(message).toBeTruthy();
      expect(typeof message).toBe('string');
      expect(message.length).toBeGreaterThan(5);
    }
  });

  it('formats known codes with the Polish message and the code in parentheses', () => {
    expect(getKsefErrorMessage(440)).toBe('Duplikat faktury (KSeF 440)');
  });

  it('appends the raw fallback when both code AND fallback are provided', () => {
    expect(getKsefErrorMessage(440, 'Invoice already accepted in session foo')).toBe(
      'Duplikat faktury (KSeF 440: Invoice already accepted in session foo)',
    );
  });

  it('falls back to the raw description with a code prefix for unknown codes', () => {
    expect(getKsefErrorMessage(9999, 'Some new error')).toBe('KSeF 9999: Some new error');
  });

  it('falls back to a generic message when neither known nor fallback is available', () => {
    expect(getKsefErrorMessage(9999)).toBe('Nieznany błąd KSeF (kod 9999)');
  });

  it('handles null/undefined codes gracefully', () => {
    expect(getKsefErrorMessage(null)).toBe('Nieznany błąd KSeF');
    expect(getKsefErrorMessage(undefined)).toBe('Nieznany błąd KSeF');
    expect(getKsefErrorMessage(null, 'something happened')).toBe('something happened');
  });
});
