import { describe, expect, it } from 'vitest';
import {
  formatDisplayDate,
  formatShortDisplayDate,
  fromDateString,
  safeParseDate,
  toDateString,
} from './date';

describe('safeParseDate', () => {
  it('returns undefined for null/undefined/empty', () => {
    expect(safeParseDate(null)).toBeUndefined();
    expect(safeParseDate(undefined)).toBeUndefined();
    expect(safeParseDate('')).toBeUndefined();
  });

  it('handles Date objects', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    const result = safeParseDate(date);
    expect(result).toEqual(date);
  });

  it('returns undefined for invalid Date objects', () => {
    const invalidDate = new Date('invalid');
    expect(safeParseDate(invalidDate)).toBeUndefined();
  });

  it('parses ISO date strings', () => {
    const result = safeParseDate('2024-01-15T12:30:00.000Z');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(0); // January
    expect(result?.getDate()).toBe(15);
  });

  it('parses yyyy-MM-dd format strings', () => {
    const result = safeParseDate('2024-01-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(0); // January
    expect(result?.getDate()).toBe(15);
  });

  it('returns undefined for invalid strings', () => {
    expect(safeParseDate('invalid')).toBeUndefined();
    expect(safeParseDate('2024/01/15')).toBeUndefined();
    expect(safeParseDate('15-01-2024')).toBeUndefined();
    expect(safeParseDate('January 15, 2024')).toBeUndefined();
  });

  it('returns undefined for non-date types', () => {
    expect(safeParseDate(123)).toBeUndefined();
    expect(safeParseDate({})).toBeUndefined();
    expect(safeParseDate([])).toBeUndefined();
    expect(safeParseDate(true)).toBeUndefined();
  });
});

describe('toDateString', () => {
  it('returns undefined for null/undefined', () => {
    expect(toDateString(null)).toBeUndefined();
    expect(toDateString(undefined)).toBeUndefined();
  });

  it('converts Date object to yyyy-MM-dd string', () => {
    const date = new Date(2024, 0, 15);
    expect(toDateString(date)).toBe('2024-01-15');
  });

  it('converts ISO string to yyyy-MM-dd string', () => {
    expect(toDateString('2024-01-15T12:30:00.000Z')).toBe('2024-01-15');
  });

  it('returns same format for yyyy-MM-dd input', () => {
    expect(toDateString('2024-01-15')).toBe('2024-01-15');
  });

  it('returns undefined for invalid input', () => {
    expect(toDateString('invalid')).toBeUndefined();
  });
});

describe('fromDateString', () => {
  it('returns undefined for null/undefined/empty', () => {
    expect(fromDateString(null)).toBeUndefined();
    expect(fromDateString(undefined)).toBeUndefined();
    expect(fromDateString('')).toBeUndefined();
  });

  it('parses yyyy-MM-dd string to Date in local timezone', () => {
    const result = fromDateString('2024-01-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(0);
    expect(result?.getDate()).toBe(15);
    // Should be local midnight, not UTC
    expect(result?.getHours()).toBe(0);
    expect(result?.getMinutes()).toBe(0);
  });

  it('returns undefined for invalid format', () => {
    expect(fromDateString('invalid')).toBeUndefined();
    expect(fromDateString('2024/01/15')).toBeUndefined();
    expect(fromDateString('15-01-2024')).toBeUndefined();
  });
});

describe('formatDisplayDate', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatDisplayDate(null)).toBe('');
    expect(formatDisplayDate(undefined)).toBe('');
  });

  it('formats Date object with Polish locale', () => {
    const date = new Date(2024, 0, 15);
    expect(formatDisplayDate(date)).toBe('15.01.2024');
  });

  it('formats yyyy-MM-dd string', () => {
    expect(formatDisplayDate('2024-01-15')).toBe('15.01.2024');
  });

  it('formats ISO string', () => {
    const result = formatDisplayDate('2024-01-15T12:30:00.000Z');
    // Result depends on timezone, but should contain the date
    expect(result).toMatch(/\d{2}\.\d{2}\.\d{4}/);
  });

  it('returns empty string for invalid input', () => {
    expect(formatDisplayDate('invalid')).toBe('');
  });

  it('accepts custom format string', () => {
    const date = new Date(2024, 0, 15);
    expect(formatDisplayDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
  });
});

describe('formatShortDisplayDate', () => {
  it('returns empty string for null/undefined', () => {
    expect(formatShortDisplayDate(null)).toBe('');
    expect(formatShortDisplayDate(undefined)).toBe('');
  });

  it('formats date with short month name', () => {
    const date = new Date(2024, 0, 15);
    const result = formatShortDisplayDate(date);
    // Polish locale short month format
    expect(result).toMatch(/15\s+sty/);
  });
});
