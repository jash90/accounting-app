import { describe, expect, it } from 'bun:test';

import { applyUpdate } from './entity-update.utils';

describe('applyUpdate', () => {
  it('should copy allowed fields from dto to entity', () => {
    const entity: Record<string, unknown> = { id: '1', name: 'old', email: 'old@test.com' };
    applyUpdate(entity, { name: 'new', email: 'new@test.com' });
    expect(entity.name).toBe('new');
    expect(entity.email).toBe('new@test.com');
  });

  it('should skip excluded keys', () => {
    const entity: Record<string, unknown> = { id: '1', name: 'old', role: 'USER' };
    applyUpdate(entity, { name: 'new', role: 'ADMIN', id: '999' }, ['id', 'role']);
    expect(entity.name).toBe('new');
    expect(entity.role).toBe('USER');
    expect(entity.id).toBe('1');
  });

  it('should skip undefined values', () => {
    const entity: Record<string, unknown> = { id: '1', name: 'old', email: 'old@test.com' };
    applyUpdate(entity, { name: 'new', email: undefined });
    expect(entity.name).toBe('new');
    expect(entity.email).toBe('old@test.com');
  });

  it('should allow null values (explicit clearing)', () => {
    const entity: Record<string, unknown> = { id: '1', name: 'old', email: 'old@test.com' };
    applyUpdate(entity, { email: null });
    expect(entity.email).toBeNull();
  });

  it('should handle empty DTO', () => {
    const entity: Record<string, unknown> = { id: '1', name: 'old' };
    applyUpdate(entity, {});
    expect(entity.name).toBe('old');
  });

  it('should handle empty excludeKeys', () => {
    const entity: Record<string, unknown> = { id: '1', name: 'old' };
    applyUpdate(entity, { name: 'new', id: '999' }, []);
    expect(entity.name).toBe('new');
    expect(entity.id).toBe('999');
  });

  it('should not copy keys not in the DTO', () => {
    const entity: Record<string, unknown> = { id: '1', name: 'old', extra: 'keep' };
    applyUpdate(entity, { name: 'new' });
    expect(entity.extra).toBe('keep');
  });
});
