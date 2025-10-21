import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/posts'

export const revalidate = 3600 // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://virtualaddresshub.co.uk'
  const posts = await getAllPosts().catch(() => []) as Array<{
    slug: string
    updatedAt?: string | Date
    createdAt?: string | Date
  }>

  const toISO = (d?: string | Date) =>
    d ? new Date(d).toISOString() : new Date().toISOString()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: toISO() },
    { url: `${base}/pricing`, lastModified: toISO() },
    { url: `${base}/help`, lastModified: toISO() },
    { url: `${base}/about`, lastModified: toISO() },
    { url: `${base}/contact`, lastModified: toISO() },
    { url: `${base}/terms`, lastModified: toISO() },
    { url: `${base}/privacy`, lastModified: toISO() },
    { url: `${base}/kyc-policy`, lastModified: toISO() },
    { url: `${base}/blog`, lastModified: toISO() },
  ]

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: toISO(p.updatedAt ?? p.createdAt),
  }))

  return [...staticRoutes, ...blogRoutes]
}
