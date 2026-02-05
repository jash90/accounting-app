import { PKD_CLASSES } from './pkd-classes';
import {
  getPkdClassesByDivision,
  getPkdClassesBySection,
  getPkdCodesForFrontend,
  getPkdComboboxOptions,
  getPkdDivisionsBySection,
  getPkdLabel,
  getPkdSectionGroups,
  getPkdSectionsForFrontend,
  getSectionName,
  getValidPkdCodes,
  isValidPkdCode,
  PKD_DIVISIONS,
  PKD_SECTIONS,
} from './pkd-codes';

describe('PKD Codes Constants', () => {
  describe('PKD_SECTIONS', () => {
    it('should have 22 sections (A-V)', () => {
      expect(PKD_SECTIONS).toHaveLength(22);
    });

    it('should have valid section structure', () => {
      PKD_SECTIONS.forEach((section) => {
        expect(section.code).toMatch(/^[A-V]$/);
        expect(section.name).toBeTruthy();
        expect(Array.isArray(section.divisions)).toBe(true);
        expect(section.divisions.length).toBeGreaterThan(0);
      });
    });

    it('should contain expected sections', () => {
      const sectionCodes = PKD_SECTIONS.map((s) => s.code);
      expect(sectionCodes).toContain('A'); // Agriculture
      expect(sectionCodes).toContain('C'); // Manufacturing
      expect(sectionCodes).toContain('J'); // Information and Communication (IT)
      expect(sectionCodes).toContain('K'); // Financial and Insurance Activities
    });
  });

  describe('PKD_DIVISIONS', () => {
    it('should have divisions for each section', () => {
      const sectionCodes = PKD_SECTIONS.map((s) => s.code);
      const divisionSections = [...new Set(PKD_DIVISIONS.map((d) => d.section))];

      sectionCodes.forEach((code) => {
        expect(divisionSections).toContain(code);
      });
    });

    it('should have valid division codes (2 digits)', () => {
      PKD_DIVISIONS.forEach((division) => {
        expect(division.code).toMatch(/^\d{2}$/);
        expect(division.name).toBeTruthy();
        expect(division.section).toMatch(/^[A-V]$/);
      });
    });
  });

  describe('PKD_CLASSES', () => {
    it('should have valid PKD class codes (XX.XX.X format)', () => {
      PKD_CLASSES.forEach((pkdClass) => {
        expect(pkdClass.code).toMatch(/^\d{2}\.\d{2}(\.[A-Z])?$/);
        expect(pkdClass.name).toBeTruthy();
        expect(pkdClass.division).toMatch(/^\d{2}$/);
        expect(pkdClass.section).toMatch(/^[A-V]$/);
      });
    });

    it('should contain common IT codes', () => {
      const codes = PKD_CLASSES.map((c) => c.code);
      expect(codes).toContain('62.01.Z'); // Software development
      expect(codes).toContain('62.02.Z'); // IT consultancy
    });
  });
});

describe('PKD Helper Functions', () => {
  describe('getPkdLabel', () => {
    it('should return label for valid division code', () => {
      const label = getPkdLabel('62');
      expect(label).toContain('62');
      expect(label).toContain('-');
    });

    it('should return label for valid class code', () => {
      const label = getPkdLabel('62.01.Z');
      expect(label).toContain('62.01.Z');
      expect(label).toContain('-');
    });

    it('should return the code itself for invalid code', () => {
      const label = getPkdLabel('INVALID');
      expect(label).toBe('INVALID');
    });
  });

  describe('getSectionName', () => {
    it('should return section name for valid code', () => {
      const name = getSectionName('A');
      expect(name).toBeTruthy();
      expect(name).not.toBe('A');
    });

    it('should return code for invalid section', () => {
      const name = getSectionName('Z');
      expect(name).toBe('Z');
    });
  });

  describe('getPkdDivisionsBySection', () => {
    it('should return a Map with all sections', () => {
      const grouped = getPkdDivisionsBySection();
      expect(grouped.size).toBe(PKD_SECTIONS.length);
    });

    it('should have divisions for section A', () => {
      const grouped = getPkdDivisionsBySection();
      const sectionA = grouped.get('A');
      expect(sectionA).toBeDefined();
      expect(sectionA?.length).toBeGreaterThan(0);
    });
  });

  describe('getPkdClassesBySection', () => {
    it('should return a Map with all sections', () => {
      const grouped = getPkdClassesBySection();
      expect(grouped.size).toBe(PKD_SECTIONS.length);
    });

    it('should have classes for section J (Information and Communication - IT)', () => {
      const grouped = getPkdClassesBySection();
      const sectionJ = grouped.get('J');
      expect(sectionJ).toBeDefined();
      expect(sectionJ?.length).toBeGreaterThan(0);
      // Section J contains IT codes like 62.01.Z (Software development)
      expect(sectionJ?.some((c) => c.code.startsWith('62.'))).toBe(true);
    });
  });

  describe('getPkdClassesByDivision', () => {
    it('should return classes for division 62', () => {
      const classes = getPkdClassesByDivision('62');
      expect(classes.length).toBeGreaterThan(0);
      classes.forEach((c) => {
        expect(c.division).toBe('62');
      });
    });

    it('should return empty array for invalid division', () => {
      const classes = getPkdClassesByDivision('00');
      expect(classes).toHaveLength(0);
    });
  });

  describe('isValidPkdCode', () => {
    it('should return true for valid PKD codes', () => {
      expect(isValidPkdCode('62.01.Z')).toBe(true);
      expect(isValidPkdCode('01.11.Z')).toBe(true);
    });

    it('should return false for invalid PKD codes', () => {
      expect(isValidPkdCode('99.99.Z')).toBe(false);
      expect(isValidPkdCode('INVALID')).toBe(false);
      expect(isValidPkdCode('')).toBe(false);
    });
  });

  describe('getValidPkdCodes', () => {
    it('should return a Set of all valid codes', () => {
      const validCodes = getValidPkdCodes();
      expect(validCodes).toBeInstanceOf(Set);
      expect(validCodes.size).toBe(PKD_CLASSES.length);
    });

    it('should contain known valid codes', () => {
      const validCodes = getValidPkdCodes();
      expect(validCodes.has('62.01.Z')).toBe(true);
      expect(validCodes.has('01.11.Z')).toBe(true);
    });
  });
});

describe('Frontend Adapter Functions', () => {
  describe('getPkdCodesForFrontend', () => {
    it('should return array with frontend format', () => {
      const codes = getPkdCodesForFrontend();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBe(PKD_CLASSES.length);
    });

    it('should have correct structure for each code', () => {
      const codes = getPkdCodesForFrontend();
      codes.forEach((code) => {
        expect(code.code).toBeDefined();
        expect(code.label).toContain(code.code);
        expect(code.label).toContain('-');
        expect(code.section).toMatch(/^[A-V]$/);
        expect(code.division).toMatch(/^\d{2}$/);
      });
    });
  });

  describe('getPkdSectionsForFrontend', () => {
    it('should return Record with section codes as keys', () => {
      const sections = getPkdSectionsForFrontend();
      expect(typeof sections).toBe('object');
      expect(Object.keys(sections).length).toBe(PKD_SECTIONS.length);
    });

    it('should have formatted labels', () => {
      const sections = getPkdSectionsForFrontend();
      expect(sections['A']).toContain('A -');
      expect(sections['K']).toContain('K -');
    });
  });

  describe('getPkdSectionGroups', () => {
    it('should return array of groups', () => {
      const groups = getPkdSectionGroups();
      expect(Array.isArray(groups)).toBe(true);
      expect(groups.length).toBe(PKD_SECTIONS.length);
    });

    it('should have correct group structure', () => {
      const groups = getPkdSectionGroups();
      groups.forEach((group) => {
        expect(group.key).toMatch(/^[A-V]$/);
        expect(group.label).toContain(group.key);
        expect(group.label).toContain('-');
      });
    });
  });

  describe('getPkdComboboxOptions', () => {
    it('should return array formatted for combobox', () => {
      const options = getPkdComboboxOptions();
      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBe(PKD_CLASSES.length);
    });

    it('should have value, label, and group properties', () => {
      const options = getPkdComboboxOptions();
      options.forEach((option) => {
        expect(option.value).toBeDefined();
        expect(option.label).toContain(option.value);
        expect(option.group).toMatch(/^[A-V]$/);
      });
    });
  });
});

describe('PKD Code Validation Pattern', () => {
  const PKD_REGEX = /^\d{2}\.\d{2}(\.[A-Z])?$/;

  it('should match valid PKD codes with letter suffix', () => {
    expect(PKD_REGEX.test('62.01.Z')).toBe(true);
    expect(PKD_REGEX.test('01.11.A')).toBe(true);
    expect(PKD_REGEX.test('99.99.Z')).toBe(true);
  });

  it('should match valid PKD codes without letter suffix', () => {
    expect(PKD_REGEX.test('62.01')).toBe(true);
    expect(PKD_REGEX.test('01.11')).toBe(true);
  });

  it('should reject invalid PKD code formats', () => {
    expect(PKD_REGEX.test('6201Z')).toBe(false); // Missing dots
    expect(PKD_REGEX.test('62.01.ZZ')).toBe(false); // Double letter
    expect(PKD_REGEX.test('62.01.1')).toBe(false); // Number instead of letter
    expect(PKD_REGEX.test('6.01.Z')).toBe(false); // Single digit division
    expect(PKD_REGEX.test('62.1.Z')).toBe(false); // Single digit group
    expect(PKD_REGEX.test('')).toBe(false); // Empty
    expect(PKD_REGEX.test('INVALID')).toBe(false); // Text
    expect(PKD_REGEX.test('62.01.z')).toBe(false); // Lowercase letter
  });
});
