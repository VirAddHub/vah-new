import { Playfair_Display, Poppins } from 'next/font/google';

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
