'use client';

import { useEffect } from 'react';

/**
 * Keeps the admin area on its original black-and-white tokens.
 * The wrapper covers server-rendered markup; the html attribute covers
 * dialogs and menus that portal to <body>.
 */
export function ClassicTheme({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'classic');
    return () => {
      if (previous === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', previous);
    };
  }, []);
  return <div className="theme-classic contents">{children}</div>;
}
