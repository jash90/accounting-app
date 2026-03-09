import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePrefetchRoute } from './use-prefetch-route';
import { prefetchRoute } from '../utils/prefetch';

vi.mock('../utils/prefetch');

describe('usePrefetchRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a stable callback function', () => {
    const { result, rerender } = renderHook(() => usePrefetchRoute('/admin/users'));

    const firstCallback = result.current;
    rerender();
    const secondCallback = result.current;

    expect(firstCallback).toBe(secondCallback);
  });

  it('should call prefetchRoute when invoked', () => {
    const { result } = renderHook(() => usePrefetchRoute('/admin/users'));

    result.current();

    expect(prefetchRoute).toHaveBeenCalledWith('/admin/users');
  });

  it('should update callback when path changes', () => {
    const { result, rerender } = renderHook(({ path }) => usePrefetchRoute(path), {
      initialProps: { path: '/admin/users' },
    });

    result.current();
    expect(prefetchRoute).toHaveBeenCalledWith('/admin/users');

    rerender({ path: '/admin/companies' });
    result.current();
    expect(prefetchRoute).toHaveBeenCalledWith('/admin/companies');
  });
});
