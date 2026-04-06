/**
 * Safely applies DTO updates to an entity, only copying fields that are
 * explicitly present (not undefined) in the DTO.
 *
 * Unlike Object.assign, this prevents mass-assignment attacks by ensuring
 * protected fields (id, companyId, createdAt, etc.) are never overwritten.
 * The TypeScript compiler ensures only valid DTO fields exist at compile time,
 * and class-validator's whitelist strips unknown fields at runtime.
 *
 * @param entity - Target entity to update
 * @param dto - Source DTO with optional fields
 * @param excludeKeys - Fields to never copy (e.g., 'id', 'companyId', 'role')
 *
 * @example
 * ```typescript
 * applyUpdate(user, updateDto, ['id', 'role', 'companyId', 'tokenVersion', 'createdAt', 'updatedAt']);
 * ```
 */
 
export function applyUpdate<T extends object>(
  entity: T,
  dto: any,
  excludeKeys: readonly string[] = []
): void {
  if (!dto || typeof dto !== 'object') return;
  const excludeSet = new Set(excludeKeys);
  for (const [key, value] of Object.entries(dto)) {
    if (value !== undefined && !excludeSet.has(key)) {
      (entity as Record<string, unknown>)[key] = value;
    }
  }
}
