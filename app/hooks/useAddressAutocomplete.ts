'use client';
import { useCallback, useMemo, useState } from 'react';
import { gaAutocomplete, gaGetById, debounce, type Suggestion, type Address } from '@/app/lib/getaddress';

export function useAddressAutocomplete() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selected, setSelected] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        if (!q || q.length < 2) return setSuggestions([]);
        setLoading(true);
        setError(null);
        try {
          const res = await gaAutocomplete(q);
          setSuggestions(res);
        } catch (e: any) {
          setError('Search failed');
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  const search = useCallback((q: string) => {
    setQuery(q);
    doSearch(q);
  }, [doSearch]);

  const selectById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const addr = await gaGetById(id);
      setSelected(addr);
      return addr;
    } catch (e: any) {
      setError('Could not fetch address');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { query, setQuery, loading, suggestions, error, selected, search, selectById };
}
