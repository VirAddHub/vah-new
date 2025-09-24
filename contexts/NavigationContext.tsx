"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface NavigationContextType {
  currentPage: string;
  navigate: (page: string, data?: any) => void;
  goBack: () => void;
  canGoBack: boolean;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [currentPage, setCurrentPage] = useState('home');
  const [history, setHistory] = useState<string[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);

  const navigate = (page: string, data?: any) => {
    // Update URL hash
    const hash = data ? `#${page}-${JSON.stringify(data)}` : `#${page}`;
    window.history.pushState({ page, data }, '', hash);
    
    // Update state
    setCurrentPage(page);
    
    // Update history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(page);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousPage = history[newIndex];
      setHistoryIndex(newIndex);
      setCurrentPage(previousPage);
      
      // Update URL
      const hash = `#${previousPage}`;
      window.history.pushState({ page: previousPage }, '', hash);
      
      // Smooth scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const canGoBack = historyIndex > 0;

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        const [page, dataString] = hash.split('-');
        const data = dataString ? JSON.parse(dataString) : undefined;
        setCurrentPage(page);
        
        // Update history index
        const pageIndex = history.findIndex(h => h === page);
        if (pageIndex !== -1) {
          setHistoryIndex(pageIndex);
        }
      } else {
        setCurrentPage('home');
        setHistoryIndex(0);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    // Initialize from URL hash
    const hash = window.location.hash.slice(1);
    if (hash) {
      const [page] = hash.split('-');
      setCurrentPage(page);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [history]);

  return (
    <NavigationContext.Provider value={{
      currentPage,
      navigate,
      goBack,
      canGoBack
    }}>
      {children}
    </NavigationContext.Provider>
  );
}
