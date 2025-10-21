import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    // STAGING MODE: Block all crawlers until GDPR compliance is complete
    // TODO: Replace with production robots.txt after GDPR approval

    const isStaging = process.env.NODE_ENV !== 'production' ||
        process.env.VERCEL_URL?.includes('vercel.app') ||
        !process.env.NEXT_PUBLIC_GA_ID

    if (isStaging) {
        return {
            rules: [{ userAgent: '*', disallow: '/' }],
            sitemap: [],
        }
    }

    // PRODUCTION MODE: Allow crawling with sitemap
    const base = 'https://virtualaddresshub.co.uk'
    return {
        rules: [{ userAgent: '*', allow: '/' }],
        sitemap: [`${base}/sitemap.xml`],
        host: base,
    }
}
