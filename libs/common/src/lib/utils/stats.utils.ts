import type { EmployeeRankingItemDto } from '../dto/employee-ranking.dto';

type RawRankingRow = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  completedCount: string;
};

/**
 * Calculates top-10 longest, top-10 shortest, and average duration for any list of items.
 *
 * @param items - Array of items to rank
 * @param getDuration - Accessor returning the numeric duration for an item
 * @param roundingPrecision - Multiplier for rounding: 10 = 1 decimal place, 1 = integer (default 10)
 */
export function calcRankedDurationStats<T>(
  items: T[],
  getDuration: (item: T) => number,
  roundingPrecision: number = 10
): { longest: T[]; shortest: T[]; averageDuration: number } {
  const sorted = [...items].sort((a, b) => getDuration(b) - getDuration(a));
  const longest = sorted.slice(0, 10);
  const shortest = [...sorted].sort((a, b) => getDuration(a) - getDuration(b)).slice(0, 10);
  const averageDuration =
    sorted.length > 0
      ? Math.round(
          (sorted.reduce((sum, item) => sum + getDuration(item), 0) / sorted.length) *
            roundingPrecision
        ) / roundingPrecision
      : 0;
  return { longest, shortest, averageDuration };
}

/**
 * Maps raw TypeORM GROUP BY query results from employee ranking queries
 * to EmployeeRankingItemDto[]. Used by task and settlement extended stats services.
 */
export function mapRawToRankings(raw: RawRankingRow[]): EmployeeRankingItemDto[] {
  return raw.map((r) => ({
    userId: r.userId,
    email: r.email,
    firstName: r.firstName,
    lastName: r.lastName,
    completedCount: parseInt(r.completedCount, 10),
  }));
}
