import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * Applies optional date range filters to a TypeORM QueryBuilder.
 * Mutates the query builder in place using named parameters `:startDate` and `:endDate`.
 *
 * @example
 * applyDateRangeFilter(qb, 'task', 'updatedAt', filters);
 * // conditionally adds: WHERE task.updatedAt >= :startDate AND task.updatedAt <= :endDate
 */
export function applyDateRangeFilter<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  dateColumn: string,
  filters?: { startDate?: string; endDate?: string }
): void {
  if (filters?.startDate) {
    qb.andWhere(`${alias}.${dateColumn} >= :startDate`, { startDate: filters.startDate });
  }
  if (filters?.endDate) {
    qb.andWhere(`${alias}.${dateColumn} <= :endDate`, { endDate: filters.endDate });
  }
}

/**
 * Resolves a date range from a time preset or explicit startDate/endDate strings.
 * Falls back to the last 30 days if no preset or startDate is provided.
 *
 * @example
 * const { start, end } = resolvePresetDateRange({ preset: '90d' });
 * const { start, end } = resolvePresetDateRange({ startDate: '2025-01-01', endDate: '2025-03-31' });
 */
export function resolvePresetDateRange(filter: {
  preset?: '30d' | '90d' | '365d';
  startDate?: string;
  endDate?: string;
}): { start: Date; end: Date } {
  const end = new Date();
  let start = new Date();

  if (filter.preset === '30d') start.setDate(start.getDate() - 30);
  else if (filter.preset === '90d') start.setDate(start.getDate() - 90);
  else if (filter.preset === '365d') start.setDate(start.getDate() - 365);
  else if (filter.startDate) start = new Date(filter.startDate);
  else start.setDate(start.getDate() - 30); // default: last 30 days

  if (filter.endDate) return { start, end: new Date(filter.endDate) };
  return { start, end };
}
