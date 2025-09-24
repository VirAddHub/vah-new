'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const search = useSearchParams(); // include this if query changes between steps

  useEffect(() => {
    // Scroll the window
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname, search]); // run on any URL change

  return null;
}
