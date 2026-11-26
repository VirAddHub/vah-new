import localFont from 'next/font/local';

/*
 * Fonts are bundled with the app (SIL Open Font License, see lib/font-files/*-OFL.txt) instead of
 * being fetched from Google Fonts at build time, so a build never depends on that service.
 */

/** Text: body, headings and UI (Tailwind `font-sans`). */
export const inter = localFont({
    src: [
        { path: './font-files/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
        { path: './font-files/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
        { path: './font-files/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
        { path: './font-files/inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-inter',
    display: 'swap',
    fallback: ['system-ui', 'Arial', 'sans-serif'],
});

/** Figures: prices, dates, references (Tailwind `font-mono`, `.figure-mono`). */
export const plex = localFont({
    src: [
        { path: './font-files/ibm-plex-mono-latin-400-normal.woff2', weight: '400', style: 'normal' },
        { path: './font-files/ibm-plex-mono-latin-500-normal.woff2', weight: '500', style: 'normal' },
    ],
    variable: '--font-plex',
    display: 'swap',
    fallback: ['ui-monospace', 'Menlo', 'monospace'],
});

/** Customer pages and marketing: body text and UI (customer-theme.css, marketing modules). */
export const dmsans = localFont({
    src: [
        { path: './font-files/dm-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
        { path: './font-files/dm-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
        { path: './font-files/dm-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
        { path: './font-files/dm-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
    ],
    variable: '--font-dmsans',
    display: 'swap',
    fallback: ['Arial', 'sans-serif'],
});

/** Customer pages and marketing: editorial headings. */
export const newsreader = localFont({
    src: [
        { path: './font-files/newsreader-latin-400-normal.woff2', weight: '400', style: 'normal' },
        { path: './font-files/newsreader-latin-400-italic.woff2', weight: '400', style: 'italic' },
        { path: './font-files/newsreader-latin-500-normal.woff2', weight: '500', style: 'normal' },
    ],
    variable: '--font-newsreader',
    display: 'swap',
    fallback: ['Georgia', 'serif'],
});
