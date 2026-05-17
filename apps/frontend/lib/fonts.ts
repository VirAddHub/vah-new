import { Playfair_Display, Poppins, Newsreader, DM_Sans, IBM_Plex_Mono } from 'next/font/google';

/**
 * Single module for next/font so server + client share one class name / @font-face set.
 * Poppins is the app-wide UI font (see Tailwind `fontFamily.sans`).
 */

/** Optional display serif for marketing accents */
export const playfair = Playfair_Display({
    subsets: ['latin'],
    weight: ['400', '700'],
    style: ['normal'],
    variable: '--font-playfair',
    display: 'swap',
});

/** App-wide UI: body, dashboard, blog, help, forms — weights used by Tailwind / components */
export const poppins = Poppins({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    variable: '--font-poppins',
    display: 'swap',
});

/** MIX homepage editorial serif — headings, hero, card titles */
export const newsreader = Newsreader({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700'],
    style: ['normal', 'italic'],
    variable: '--font-newsreader',
    display: 'swap',
});

/** MIX homepage editorial sans — body copy, nav, UI labels */
export const dmsans = DM_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-dmsans',
    display: 'swap',
});

/** MIX homepage monospace — price figures, stamps, code labels */
export const plex = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500'],
    variable: '--font-plex',
    display: 'swap',
});
