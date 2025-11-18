'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Force light mode - dark mode disabled
  const [theme, setTheme] = useState<Theme>('light');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Always use light mode - ignore saved theme preference
    setTheme('light');
    // Clear any saved dark theme preference
    localStorage.setItem('theme', 'light');
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Always force light mode - remove dark class if present
    setActualTheme('light');
    root.classList.remove('dark');
    // Save light theme preference
    localStorage.setItem('theme', 'light');
  }, [theme]);

  // Override setTheme to always force light mode
  const forceLightTheme = () => {
    setTheme('light');
    const root = document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme: 'light', setTheme: forceLightTheme, actualTheme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Dark mode toggle component
export function DarkModeToggle() {
  const { theme, setTheme, actualTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`}
    >
      {actualTheme === 'light' ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}

// Theme-aware component wrapper
export function ThemeAware({ children }: { children: React.ReactNode }) {
  const { actualTheme } = useTheme();
  
  return (
    <div className={`theme-${actualTheme}`}>
      {children}
    </div>
  );
}
