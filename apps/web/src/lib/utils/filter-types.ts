/**
 * Standardized filter value utilities for consistent handling of "all" state in Select components.
 * Eliminates inconsistency between 'all', '__all__', '', and undefined.
 */

/**
 * Constant for the "all" filter value used in Select components.
 * Use this to maintain consistency across all filter implementations.
 */
export const ALL_FILTER_VALUE = '__all__' as const;

/**
 * Type representing the "all" filter value.
 */
export type AllFilterValue = typeof ALL_FILTER_VALUE;

/**
 * Converts a Select value to a filter value.
 * Transforms the special "all" select value to undefined for API calls.
 *
 * @param selectValue - The value from a Select component
 * @returns The filter value (undefined if "all" was selected, otherwise the original value)
 *
 * @example
 * ```ts
 * toFilterValue('__all__') // undefined
 * toFilterValue('active') // 'active'
 * toFilterValue('') // undefined
 * ```
 */
export function toFilterValue<T extends string>(
  selectValue: T | AllFilterValue | '' | undefined
): T | undefined {
  if (!selectValue || selectValue === ALL_FILTER_VALUE || selectValue === '') {
    return undefined;
  }
  return selectValue as T;
}

/**
 * Converts a filter value to a Select value.
 * Transforms undefined to the "all" select value for display.
 *
 * @param filterValue - The filter value (possibly undefined)
 * @returns The Select value (ALL_FILTER_VALUE if undefined, otherwise the original value)
 *
 * @example
 * ```ts
 * fromFilterValue(undefined) // '__all__'
 * fromFilterValue('active') // 'active'
 * fromFilterValue('') // '__all__'
 * ```
 */
export function fromFilterValue<T extends string>(
  filterValue: T | undefined | null | ''
): T | AllFilterValue {
  if (!filterValue) {
    return ALL_FILTER_VALUE;
  }
  return filterValue;
}

/**
 * Converts a boolean filter value to a Select string value.
 *
 * @param value - The boolean filter value
 * @returns 'true', 'false', or ALL_FILTER_VALUE for undefined
 *
 * @example
 * ```ts
 * booleanToSelectValue(true) // 'true'
 * booleanToSelectValue(false) // 'false'
 * booleanToSelectValue(undefined) // '__all__'
 * ```
 */
export function booleanToSelectValue(value: boolean | undefined | null): string {
  if (value === undefined || value === null) {
    return ALL_FILTER_VALUE;
  }
  return value ? 'true' : 'false';
}

/**
 * Converts a Select string value back to a boolean filter value.
 *
 * @param selectValue - The Select value ('true', 'false', or ALL_FILTER_VALUE)
 * @returns The boolean value or undefined for "all"
 *
 * @example
 * ```ts
 * selectValueToBoolean('true') // true
 * selectValueToBoolean('false') // false
 * selectValueToBoolean('__all__') // undefined
 * ```
 */
export function selectValueToBoolean(selectValue: string): boolean | undefined {
  if (selectValue === ALL_FILTER_VALUE || selectValue === '') {
    return undefined;
  }
  return selectValue === 'true';
}
