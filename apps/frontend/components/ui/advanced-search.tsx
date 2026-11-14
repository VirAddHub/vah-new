'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Button } from './button';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'page' | 'blog' | 'help' | 'pricing';
  category?: string;
}

interface AdvancedSearchProps {
  onNavigate?: (page: string, data?: any) => void;
  placeholder?: string;
  className?: string;
}

export function AdvancedSearch({ 
  onNavigate, 
  placeholder = "Search everything...",
  className = ""
}: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches] = useState([
    'virtual business address',
    'UK company formation',
    'mail forwarding',
    'Companies House',
    'HMRC compliance'
  ]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock search data - in real app, this would come from API
  const searchData: SearchResult[] = [
    {
      id: '1',
      title: 'What is a Virtual Business Address?',
      description: 'Learn about virtual business addresses and how they work for UK companies.',
      url: '/blog/what-is-virtual-business-address',
      type: 'blog',
      category: 'Business Address'
    },
    {
      id: '2',
      title: 'UK Company Formation Guide',
      description: 'Complete guide to forming a UK limited company with virtual address.',
      url: '/blog/uk-company-formation-guide',
      type: 'blog',
      category: 'Company Formation'
    },
    {
      id: '3',
      title: 'Pricing Plans',
      description: 'View our virtual address pricing plans starting from £9.99/month.',
      url: '/pricing',
      type: 'pricing'
    },
    {
      id: '4',
      title: 'Mail Forwarding Service',
      description: 'Professional mail forwarding and scanning services.',
      url: '/help/mail-forwarding',
      type: 'help',
      category: 'Services'
    },
    {
      id: '5',
      title: 'Contact Support',
      description: 'Get help with your virtual address service.',
      url: '/contact',
      type: 'page'
    }
  ];

  // Search function with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      const filteredResults = searchData.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category?.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filteredResults);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultClick(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Save to recent searches
    const newRecentSearches = [result.title, ...recentSearches.filter(s => s !== result.title)].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newRecentSearches));

    // Navigate to result
    if (onNavigate) {
      if (result.type === 'blog') {
        onNavigate('blog-post', { slug: result.url.split('/').pop() });
      } else {
        onNavigate(result.type, {});
      }
    }

    setIsOpen(false);
    setQuery('');
  };

  const handleRecentSearchClick = (searchTerm: string) => {
    setQuery(searchTerm);
    inputRef.current?.focus();
  };

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches');
      }
    }
  }, []);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 form-input"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
          {query ? (
            <>
              {/* Search Results */}
              {results.length > 0 ? (
                <div className="p-2">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      onClick={() => handleResultClick(result)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        index === selectedIndex
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          {result.type === 'blog' && <Search className="h-4 w-4" />}
                          {result.type === 'pricing' && <TrendingUp className="h-4 w-4" />}
                          {result.type === 'help' && <Clock className="h-4 w-4" />}
                          {result.type === 'page' && <Search className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{result.title}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {result.description}
                          </div>
                          {result.category && (
                            <div className="text-xs text-primary mt-1">{result.category}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No results found for "{query}"
                </div>
              )}
            </>
          ) : (
            <div className="p-4">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Recent Searches
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Popular Searches
                </div>
                <div className="space-y-1">
                  {popularSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(search)}
                      className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors text-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
