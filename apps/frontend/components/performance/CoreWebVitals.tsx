'use client';

/**
 * CoreWebVitals.tsx
 *
 * Intentionally minimal. Next.js handles font preloading, image optimisation,
 * script deferral, and CSS delivery automatically via next/font, next/image,
 * and the built-in App Router pipeline.
 *
 * The previous version of this file:
 *  - injected a Google Fonts <link rel="preload" as="style"> even though
 *    next/font already loads UI fonts — causing duplicate / conflicting loads
 *  - called deferNonCriticalJS() which iterated ALL script[src] elements and
 *    added defer="" to them at runtime, interfering with Next.js chunk loading
 *    and producing "Refused to execute script … MIME type text/css" errors
 *    when it touched module-preload links Next.js injects for CSS chunks
 *  - injected a <style> tag to redefine @font-face font-display:swap,
 *    which already has display:swap configured in next/font
 *
 * None of those functions are needed. Web Vitals measurement (initWebVitals)
 * lives in lib/web-vitals.ts and is called from WebVitalsProvider.
 *
 * These empty components are exported so any existing imports do not break.
 */

export function CoreWebVitalsOptimizer() {
  return null;
}

export function ResourceHints() {
  return null;
}

export function CriticalCSS() {
  return null;
}
