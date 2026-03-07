'use client';

import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/services/http';

const BUSINESSES_KEY = '/api/bff/account/businesses';
const STORAGE_KEY = 'vah_active_business_id';

export interface Business {
  id: number;
  user_id: number;
  company_name: string;
  trading_name: string | null;
  companies_house_number: string | null;
  status: string;
  is_primary: boolean;
  monthly_price_pence: number;
  display_price_pence?: number;
  created_at: number;
  updated_at: number;
}

interface ActiveBusinessContextType {
  businesses: Business[];
  activeBusiness: Business | null;
  activeBusinessId: number | null;
  setActiveBusinessId: (id: number | null) => void;
  isLoading: boolean;
  mutate: () => void;
}

const ActiveBusinessContext = createContext<ActiveBusinessContextType | undefined>(undefined);

export function ActiveBusinessProvider({ children }: { children: ReactNode }) {
  const { data, mutate, isLoading } = useSWR<{ ok: boolean; data?: Business[] }>(BUSINESSES_KEY, swrFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const businesses = useMemo(() => (data?.ok && Array.isArray(data.data) ? data.data : []), [data]);

  const [activeBusinessId, setActiveBusinessIdState] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const n = parseInt(stored, 10);
      if (!Number.isNaN(n)) return n;
    }
    return null;
  });

  const primaryOrFirst = useMemo(() => {
    const primary = businesses.find((b) => b.is_primary);
    return primary ?? businesses[0] ?? null;
  }, [businesses]);

  useEffect(() => {
    if (businesses.length === 0) return;
    const current = activeBusinessId != null ? businesses.find((b) => b.id === activeBusinessId) : null;
    if (current) return;
    const fallback = primaryOrFirst?.id ?? null;
    setActiveBusinessIdState(fallback);
    if (fallback != null && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, String(fallback));
    }
  }, [businesses, primaryOrFirst, activeBusinessId]);

  const setActiveBusinessId = useCallback((id: number | null) => {
    setActiveBusinessIdState(id);
    if (typeof window !== 'undefined') {
      if (id == null) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, String(id));
    }
  }, []);

  const activeBusiness = useMemo(() => {
    if (activeBusinessId == null) return primaryOrFirst;
    return businesses.find((b) => b.id === activeBusinessId) ?? primaryOrFirst;
  }, [businesses, activeBusinessId, primaryOrFirst]);

  const value = useMemo(
    () => ({
      businesses,
      activeBusiness,
      activeBusinessId: activeBusiness?.id ?? null,
      setActiveBusinessId,
      isLoading,
      mutate,
    }),
    [businesses, activeBusiness, setActiveBusinessId, isLoading, mutate]
  );

  return (
    <ActiveBusinessContext.Provider value={value}>
      {children}
    </ActiveBusinessContext.Provider>
  );
}

export function useActiveBusiness() {
  const context = useContext(ActiveBusinessContext);
  if (context === undefined) {
    throw new Error('useActiveBusiness must be used within an ActiveBusinessProvider');
  }
  return context;
}
