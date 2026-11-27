/** The live site's address: every canonical link, the sitemap and social tags use it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://virtualaddresshub.co.uk').replace(/\/$/, '');

/**
 * Search engines may index the site only when this is switched on (set NEXT_PUBLIC_ALLOW_INDEXING=true
 * on the live site at launch). Staging and previews stay out of Google, even though Vercel calls
 * the staging deployment "production".
 */
export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

/** The branded share card (app/opengraph-image.tsx). Pages that set their own openGraph must list it,
 * because a page's openGraph replaces the site default as a whole, image included. */
export const OG_IMAGES = [{ url: '/social-card', width: 1200, height: 630, alt: 'VirtualAddressHub: a London SE1 business address with same-day mail scanning' }];
