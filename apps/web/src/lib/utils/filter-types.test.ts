import { describe, expect, it } from 'vitest';

import {
  ALL_FILTER_VALUE,
  booleanToSelectValue,
  fromFilterValue,
  selectValueToBoolean,
  toFilterValue,
} from './filter-types';

describe('ALL_FILTER_VALUE', () => {
  it('has the expected value', () => {
    expect(ALL_FILTER_VALUE).toBe('__all__');
  });
});

describe('toFilterValue', () => {
  it('converts ALL_FILTER_VALUE to undefined', () => {
    expect(toFilterValue(ALL_FILTER_VALUE)).toBeUndefined();
  });

  it('converts empty string to undefined', () => {
    expect(toFilterValue('')).toBeUndefined();
  });

  it('converts undefined to undefined', () => {
    expect(toFilterValue(undefined)).toBeUndefined();
  });

  it('passes through valid values', () => {
    expect(toFilterValue('active')).toBe('active');
    expect(toFilterValue('pending')).toBe('pending');
    expect(toFilterValue('some-uuid-string')).toBe('some-uuid-string');
  });
});

describe('fromFilterValue', () => {
  it('converts undefined to ALL_FILTER_VALUE', () => {
    expect(fromFilterValue(undefined)).toBe(ALL_FILTER_VALUE);
  });

  it('converts null to ALL_FILTER_VALUE', () => {
    expect(fromFilterValue(null)).toBe(ALL_FILTER_VALUE);
  });

  it('converts empty string to ALL_FILTER_VALUE', () => {
    expect(fromFilterValue('')).toBe(ALL_FILTER_VALUE);
  });

  it('passes through valid values', () => {
    expect(fromFilterValue('active')).toBe('active');
    expect(fromFilterValue('pending')).toBe('pending');
    expect(fromFilterValue('some-uuid-string')).toBe('some-uuid-string');
  });
});

describe('booleanToSelectValue', () => {
  it('converts undefined to ALL_FILTER_VALUE', () => {
    expect(booleanToSelectValue(undefined)).toBe(ALL_FILTER_VALUE);
  });

  it('converts null to ALL_FILTER_VALUE', () => {
    expect(booleanToSelectValue(null)).toBe(ALL_FILTER_VALUE);
  });

  it('converts true to "true"', () => {
    expect(booleanToSelectValue(true)).toBe('true');
  });

  it('converts false to "false"', () => {
    expect(booleanToSelectValue(false)).toBe('false');
  });
});

describe('selectValueToBoolean', () => {
  it('converts ALL_FILTER_VALUE to undefined', () => {
    expect(selectValueToBoolean(ALL_FILTER_VALUE)).toBeUndefined();
  });

  it('converts empty string to undefined', () => {
    expect(selectValueToBoolean('')).toBeUndefined();
  });

  it('converts "true" to true', () => {
    expect(selectValueToBoolean('true')).toBe(true);
  });

  it('converts "false" to false', () => {
    expect(selectValueToBoolean('false')).toBe(false);
  });

  it('converts other values to false', () => {
    expect(selectValueToBoolean('something')).toBe(false);
    expect(selectValueToBoolean('yes')).toBe(false);
  });
});
