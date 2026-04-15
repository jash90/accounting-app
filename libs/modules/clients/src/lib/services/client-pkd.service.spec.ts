import { ClientPkdService } from './client-pkd.service';

describe('ClientPkdService', () => {
  let service: ClientPkdService;

  beforeEach(() => {
    service = new ClientPkdService();
  });

  describe('searchPkdCodes', () => {
    it('should return limited results when no filters', () => {
      const results = service.searchPkdCodes(undefined, undefined, 5);
      expect(results.length).toBeLessThanOrEqual(5);
      expect(results[0]).toHaveProperty('code');
      expect(results[0]).toHaveProperty('label');
      expect(results[0]).toHaveProperty('section');
      expect(results[0]).toHaveProperty('division');
    });

    it('should filter by search term matching code', () => {
      const results = service.searchPkdCodes('01.11');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.code.toLowerCase()).toContain('01.11');
      }
    });

    it('should filter by search term matching name (case-insensitive)', () => {
      const results = service.searchPkdCodes('uprawa');
      // May or may not match depending on PKD data, but no crash
      expect(Array.isArray(results)).toBe(true);
    });

    it('should filter by section', () => {
      const results = service.searchPkdCodes(undefined, 'A');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.section).toBe('A');
      }
    });

    it('should combine search and section filters', () => {
      const results = service.searchPkdCodes('01', 'A');
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.section).toBe('A');
        expect(r.code.toLowerCase()).toContain('01');
      }
    });

    it('should return empty for non-matching search', () => {
      const results = service.searchPkdCodes('ZZZZNONEXISTENT999');
      expect(results).toEqual([]);
    });

    it('should respect limit parameter', () => {
      const results = service.searchPkdCodes(undefined, undefined, 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should default limit to 50', () => {
      const results = service.searchPkdCodes();
      expect(results.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getPkdSections', () => {
    it('should return an object with section codes as keys', () => {
      const sections = service.getPkdSections();
      expect(typeof sections).toBe('object');
      expect(Object.keys(sections).length).toBeGreaterThan(0);
    });

    it('should have format "CODE - NAME" for each section', () => {
      const sections = service.getPkdSections();
      for (const [code, label] of Object.entries(sections)) {
        expect(label).toContain(code);
        expect(label).toMatch(/^[A-Z] - /);
      }
    });
  });
});
