import { useState, useEffect, useCallback } from 'react';

interface UseDebouncedSearchOptions {
  delay?: number;
  minLength?: number;
  onSearch: (query: string) => void | Promise<void>;
}

interface UseDebouncedSearchReturn {
  query: string;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  isSearching: boolean;
  clearSearch: () => void;
}

/**
 * Custom hook for debounced search functionality
 * 
 * @param options Configuration options
 * @param options.delay Debounce delay in milliseconds (default: 300)
 * @param options.minLength Minimum query length before triggering search (default: 0)
 * @param options.onSearch Function to call when search is triggered
 * 
 * @returns Object containing query state and control functions
 * 
 * @example
 * ```tsx
 * const { query, debouncedQuery, setQuery, isSearching, clearSearch } = useDebouncedSearch({
 *   delay: 500,
 *   minLength: 2,
 *   onSearch: async (query) => {
 *     const results = await searchAPI(query);
 *     setResults(results);
 *   }
 * });
 * 
 * return (
 *   <Input
 *     value={query}
 *     onChange={(e) => setQuery(e.target.value)}
 *     placeholder="Search..."
 *   />
 * );
 * ```
 */
export function useDebouncedSearch({
  delay = 300,
  minLength = 0,
  onSearch
}: UseDebouncedSearchOptions): UseDebouncedSearchReturn {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Debounce the query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= minLength) {
      setIsSearching(true);
      
      const performSearch = async () => {
        try {
          await onSearch(debouncedQuery);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsSearching(false);
        }
      };

      performSearch();
    } else {
      setIsSearching(false);
    }
  }, [debouncedQuery, minLength, onSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setIsSearching(false);
  }, []);

  return {
    query,
    debouncedQuery,
    setQuery,
    isSearching,
    clearSearch
  };
}

/**
 * Simplified hook for basic debounced search without async handling
 * 
 * @param delay Debounce delay in milliseconds (default: 300)
 * @param minLength Minimum query length before triggering search (default: 0)
 * 
 * @returns Object containing query state and control functions
 * 
 * @example
 * ```tsx
 * const { query, debouncedQuery, setQuery, clearSearch } = useSimpleDebouncedSearch(500, 2);
 * 
 * useEffect(() => {
 *   if (debouncedQuery.length >= 2) {
 *     // Perform search with debouncedQuery
 *     performSearch(debouncedQuery);
 *   }
 * }, [debouncedQuery]);
 * ```
 */
export function useSimpleDebouncedSearch(
  delay: number = 300,
  minLength: number = 0
) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    debouncedQuery,
    setQuery,
    clearSearch,
    shouldSearch: debouncedQuery.length >= minLength
  };
}
