import { Inter, IBM_Plex_Mono } from 'next/font/google';

/** Text: body, headings and UI (Tailwind `font-sans`). */
export const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-inter',
    display: 'swap',
});

/** Figures: prices, dates, references (Tailwind `font-mono`, `.figure-mono`). */
export const plex = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    variable: '--font-plex',
    display: 'swap',
});
