import { useCallback, useRef } from 'react';

interface PDFPreloaderOptions {
  apiBase?: string;
  useBlobFallback?: boolean;
}

export function usePDFPreloader({ apiBase, useBlobFallback = true }: PDFPreloaderOptions = {}) {
  const preloadedUrls = useRef<Map<number, string>>(new Map());
  const preloadingPromises = useRef<Map<number, Promise<string | null>>>(new Map());

  const preloadPDF = useCallback(async (mailItemId: number): Promise<string | null> => {
    // Return cached URL if already preloaded
    if (preloadedUrls.current.has(mailItemId)) {
      return preloadedUrls.current.get(mailItemId)!;
    }

    // Return existing promise if already preloading
    if (preloadingPromises.current.has(mailItemId)) {
      return preloadingPromises.current.get(mailItemId)!;
    }

    const preloadPromise = (async () => {
      try {
        // Build URL
        const apiBaseRaw = apiBase || 
          process.env.NEXT_PUBLIC_API_BASE ||
          process.env.BACKEND_API_ORIGIN ||
          '';
        const apiBaseClean = apiBaseRaw.replace(/\/+$/, '');
        const baseWithApi = apiBaseClean.endsWith('/api') ? apiBaseClean : `${apiBaseClean}/api`;
        const url = `${baseWithApi}/bff/mail/scan-url?mailItemId=${encodeURIComponent(mailItemId)}&disposition=inline`;

        if (!useBlobFallback) {
          preloadedUrls.current.set(mailItemId, url);
          return url;
        }

        // Fetch with JWT token
        const token = (typeof window !== 'undefined') ? localStorage.getItem('vah_jwt') : null;
        const res = await fetch(url, {
          credentials: 'include',
          cache: 'default',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          throw new Error(`Failed to preload PDF (${res.status})`);
        }

        const ab = await res.arrayBuffer();
        const blob = new Blob([ab], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        
        preloadedUrls.current.set(mailItemId, blobUrl);
        return blobUrl;
      } catch (error) {
        console.warn(`Failed to preload PDF for mail item ${mailItemId}:`, error);
        return null;
      }
    })();

    preloadingPromises.current.set(mailItemId, preloadPromise);
    return preloadPromise;
  }, [apiBase, useBlobFallback]);

  const getPreloadedURL = useCallback((mailItemId: number): string | null => {
    return preloadedUrls.current.get(mailItemId) || null;
  }, []);

  const clearPreloadedURL = useCallback((mailItemId: number) => {
    const url = preloadedUrls.current.get(mailItemId);
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    preloadedUrls.current.delete(mailItemId);
    preloadingPromises.current.delete(mailItemId);
  }, []);

  const clearAllPreloadedURLs = useCallback(() => {
    preloadedUrls.current.forEach((url) => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
    preloadedUrls.current.clear();
    preloadingPromises.current.clear();
  }, []);

  return {
    preloadPDF,
    getPreloadedURL,
    clearPreloadedURL,
    clearAllPreloadedURLs,
  };
}
