import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { clientsApi } from '../api/endpoints/clients';
import { useDebounce } from './use-debounce';

const PKD_SEARCH_DEBOUNCE_MS = 300;
const PKD_SEARCH_STALE_TIME = 5 * 60 * 1000; // 5 minutes

/**
 * Custom hook for server-side PKD code search with debouncing.
 * Replaces static loading of ~659 PKD codes with on-demand search.
 *
 * @param initialSearch - Initial search term
 * @param initialSection - Initial section filter (A-V)
 * @returns Search state and results
 *
 * @example
 * ```tsx
 * const { search, setSearch, section, setSection, options, groups, isLoading } = usePkdSearch();
 *
 * return (
 *   <GroupedCombobox
 *     options={options}
 *     groups={groups}
 *     onSearchChange={setSearch}
 *     isLoading={isLoading}
 *   />
 * );
 * ```
 */
export function usePkdSearch(initialSearch = '', initialSection?: string) {
  const [search, setSearch] = useState(initialSearch);
  const [section, setSection] = useState(initialSection);

  // Debounce search to avoid excessive API calls
  const debouncedSearch = useDebounce(search, PKD_SEARCH_DEBOUNCE_MS);

  // Fetch PKD codes based on debounced search
  const {
    data: pkdCodes = [],
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['pkd-codes', 'search', debouncedSearch, section],
    queryFn: () =>
      clientsApi.searchPkdCodes({
        search: debouncedSearch || undefined,
        section: section || undefined,
        limit: 50,
      }),
    staleTime: PKD_SEARCH_STALE_TIME,
    // Always fetch on mount to show initial results
    refetchOnMount: true,
  });

  // Fetch PKD sections for the section filter dropdown
  const { data: sectionsData } = useQuery({
    queryKey: ['pkd-codes', 'sections'],
    queryFn: () => clientsApi.getPkdSections(),
    staleTime: Infinity, // Sections never change
  });

  // Transform PKD codes to combobox options format
  const options = useMemo(
    () =>
      pkdCodes.map((pkd) => ({
        value: pkd.code,
        label: pkd.label,
        group: pkd.section,
      })),
    [pkdCodes]
  );

  // Transform sections to groups format
  const groups = useMemo(() => {
    if (!sectionsData) return [];
    return Object.entries(sectionsData).map(([key, label]) => ({
      key,
      label,
    }));
  }, [sectionsData]);

  // Section options for filter dropdown
  const sectionOptions = useMemo(() => {
    if (!sectionsData) return [];
    return Object.entries(sectionsData).map(([value, label]) => ({
      value,
      label,
    }));
  }, [sectionsData]);

  return {
    // Search state
    search,
    setSearch,
    debouncedSearch,

    // Section filter state
    section,
    setSection,
    sectionOptions,

    // Results
    options,
    groups,
    pkdCodes,

    // Loading states
    isLoading,
    isFetching,
  };
}

/**
 * Hook to fetch a single PKD code by its code.
 * Useful for displaying the selected value when you have the code but not the label.
 *
 * @param code - The PKD code to fetch
 * @returns The PKD code option or undefined
 */
export function usePkdCode(code: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['pkd-codes', 'single', code],
    queryFn: () =>
      clientsApi.searchPkdCodes({
        search: code || undefined,
        limit: 1,
      }),
    enabled: !!code,
    staleTime: Infinity, // Specific code lookup never changes
    select: (data) => data.find((pkd) => pkd.code === code),
  });

  return data;
}
