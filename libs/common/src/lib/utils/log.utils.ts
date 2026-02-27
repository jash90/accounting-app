/**
 * Picks the given fields from an entity and returns a plain object safe for
 * structured logging. Omits any fields not explicitly listed so that sensitive
 * or large payload fields never leak into log output.
 */
export function sanitizeForLog<T extends object>(
  entity: T,
  fields: (keyof T)[]
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    result[field as string] = entity[field];
  }
  return result;
}
