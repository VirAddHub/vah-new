'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { searchAddress, type Address } from '@/app/lib/address-finder';

function debounce<F extends (...args: any[]) => void>(fn: F, ms = 300) {
  let t: any;
  return (...args: Parameters<F>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function useAddressFinder() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Address[]>([]);
  const [error, setError] = useState<string | null>(null);

  const lastQuery = useRef<{ postcode: string; building?: string }>({ postcode: '' });

  const run = useCallback(async (postcode: string, building?: string) => {
    try {
      setError(null);
      setLoading(true);
      lastQuery.current = { postcode, building };
      const data = await searchAddress(postcode, building);
      setResults(data);
    } catch (e: any) {
      setError(e?.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debounced = useMemo(() => debounce(run, 300), [run]);

  return {
    loading,
    results,
    error,
    search: debounced,
    searchNow: run,
    lastQuery,
    clear: () => setResults([]),
  };
}
