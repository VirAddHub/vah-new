'use client';

import { useState, useRef, useEffect } from 'react';
import { useCompaniesHouse } from '@/app/hooks/useCompaniesHouse';
import { CompanySearchResult, CompanyProfile } from '@/app/lib/companies-house';

interface CompanySearchInputProps {
  onCompanySelected?: (profile: CompanyProfile) => void;
  placeholder?: string;
  className?: string;
}

export default function CompanySearchInput({ 
  onCompanySelected, 
  placeholder = "Search for your company...",
  className = ""
}: CompanySearchInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    isSearching,
    searchResults,
    isFetchingProfile,
    selectedProfile,
    search,
    selectCompany,
    clearSearch,
    clearSelection,
  } = useCompaniesHouse({
    onError: (error) => {
      console.error('Company search error:', error);
      // You could show a toast notification here
    }
  });

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value.trim()) {
      search(value);
      setShowDropdown(true);
    } else {
      clearSearch();
      setShowDropdown(false);
    }
  };

  // Handle company selection
  const handleCompanySelect = async (company: CompanySearchResult) => {
    setInputValue(company.title);
    setShowDropdown(false);
    
    try {
      await selectCompany(company.company_number);
      onCompanySelected?.(selectedProfile!);
    } catch (error) {
      console.error('Failed to fetch company profile:', error);
    }
  };

  // Handle clear
  const handleClear = () => {
    setInputValue('');
    clearSearch();
    clearSelection();
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isFetchingProfile}
        />
        
        {/* Loading indicator */}
        {isSearching && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {/* Clear button */}
        {inputValue && !isFetchingProfile && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown with search results */}
      {showDropdown && searchResults.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {searchResults.map((company) => (
            <button
              key={company.company_number}
              type="button"
              onClick={() => handleCompanySelect(company)}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
            >
              <div className="font-medium text-gray-900">{company.title}</div>
              <div className="text-sm text-gray-500">
                {company.company_number} • {company.status}
              </div>
              {company.address && (
                <div className="text-xs text-gray-400">{company.address}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected company profile display */}
      {selectedProfile && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-green-900">{selectedProfile.company_name}</h3>
              <p className="text-sm text-green-700">
                Company Number: {selectedProfile.company_number}
              </p>
              <p className="text-sm text-green-700">
                Status: {selectedProfile.company_status}
              </p>
              {selectedProfile.address.line1 && (
                <p className="text-sm text-green-700">
                  Address: {[
                    selectedProfile.address.line1,
                    selectedProfile.address.line2,
                    selectedProfile.address.city,
                    selectedProfile.address.postcode
                  ].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 text-green-600 hover:text-green-800"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
