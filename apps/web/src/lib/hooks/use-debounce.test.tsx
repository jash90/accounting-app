import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from './use-debounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));

    expect(result.current).toBe('hello');
  });

  it('should debounce the value after the specified delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'hello', delay: 300 },
    });

    // Update value
    rerender({ value: 'world', delay: 300 });

    // Should still be the old value before delay
    expect(result.current).toBe('hello');

    // Advance timers past delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('world');
  });

  it('should reset the timer when value changes before delay', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'a', delay: 300 },
    });

    // Rapid changes
    rerender({ value: 'ab', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    rerender({ value: 'abc', delay: 300 });
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Not enough time has passed since last change
    expect(result.current).toBe('a');

    // Advance past delay from last change
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('abc');
  });

  it('should handle different delay values', () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: 'test', delay: 500 },
    });

    rerender({ value: 'updated', delay: 500 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Still old value at 300ms with 500ms delay
    expect(result.current).toBe('test');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe('updated');
  });
});
