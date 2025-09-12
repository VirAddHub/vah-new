'use client';

import { useState, useCallback, useRef } from 'react';
import { searchCompanies, fetchCompanyProfile, CompanySearchResult, CompanyProfile } from '@/app/lib/companies-house';

export interface UseCompaniesHouseOptions {
  debounceMs?: number;
  onError?: (error: Error) => void;
}

export interface UseCompaniesHouseReturn {
  // Search state
  isSearching: boolean;
  searchResults: CompanySearchResult[];
  
  // Profile state
  isFetchingProfile: boolean;
  selectedProfile: CompanyProfile | null;
  
  // Actions
  search: (query: string) => void;
  selectCompany: (companyNumber: string) => Promise<void>;
  clearSearch: () => void;
  clearSelection: () => void;
}

export function useCompaniesHouse(options: UseCompaniesHouseOptions = {}): UseCompaniesHouseReturn {
  const { debounceMs = 300, onError } = options;
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<CompanySearchResult[]>([]);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<CompanyProfile | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const handleError = useCallback((error: Error) => {
    console.error('Companies House API error:', error);
    onError?.(error);
  }, [onError]);
  
  const search = useCallback((query: string) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    
    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchCompanies(query);
        setSearchResults(results);
      } catch (error) {
        handleError(error as Error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, debounceMs);
  }, [debounceMs, handleError]);
  
  const selectCompany = useCallback(async (companyNumber: string) => {
    setIsFetchingProfile(true);
    
    try {
      const profile = await fetchCompanyProfile(companyNumber);
      setSelectedProfile(profile);
      setSearchResults([]); // Clear search results after selection
    } catch (error) {
      handleError(error as Error);
    } finally {
      setIsFetchingProfile(false);
    }
  }, [handleError]);
  
  const clearSearch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setSearchResults([]);
    setIsSearching(false);
  }, []);
  
  const clearSelection = useCallback(() => {
    setSelectedProfile(null);
  }, []);
  
  return {
    isSearching,
    searchResults,
    isFetchingProfile,
    selectedProfile,
    search,
    selectCompany,
    clearSearch,
    clearSelection,
  };
}
