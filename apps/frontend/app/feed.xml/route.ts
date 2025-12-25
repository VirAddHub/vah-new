import { NextResponse } from 'next/server'
import { getAllPosts } from '@/lib/posts'

export const revalidate = 3600

export async function GET() {
  const base = 'https://virtualaddresshub.co.uk'
  const posts = await getAllPosts().catch(() => [])
  const items = posts.map((p: any) => `
    <item>
      <title><![CDATA[${p.title || p.slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}]]></title>
      <link>${base}/blog/${p.slug}</link>
      <guid>${base}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.createdAt || p.date || Date.now()).toUTCString()}</pubDate>
      <description><![CDATA[${p.excerpt || p.description || ''}]]></description>
    </item>
  `).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
  <rss version="2.0">
    <channel>
      <title>VirtualAddressHub Blog</title>
      <link>${base}/blog</link>
      <description>Latest posts from VirtualAddressHub - Your London Business Address</description>
      ${items}
    </channel>
  </rss>`

  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  })
}


