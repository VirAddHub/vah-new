import { MetadataRoute } from 'next'
import { getAllPosts } from '@/lib/posts'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://virtualaddresshub.co.uk'

  // Must return [{ slug: string, updatedAt?: string|Date, createdAt?: string|Date }]
  const posts = await getAllPosts().catch(() => []) as Array<{
    slug: string
    updatedAt?: string | Date
    createdAt?: string | Date
  }>

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date() },
    { url: `${base}/pricing`, lastModified: new Date() },
    { url: `${base}/help`, lastModified: new Date() },
    { url: `${base}/about`, lastModified: new Date() },
    { url: `${base}/contact`, lastModified: new Date() },
    { url: `${base}/terms`, lastModified: new Date() },
    { url: `${base}/privacy`, lastModified: new Date() },
    { url: `${base}/kyc-policy`, lastModified: new Date() },
    { url: `${base}/blog`, lastModified: new Date() },
  ]

  const blogRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: p.updatedAt ?? p.createdAt ?? new Date(),
  }))

  return [...staticRoutes, ...blogRoutes]
}
