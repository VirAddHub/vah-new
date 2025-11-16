import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "../mdx-components";
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

async function getPost(slug: string) {
  try {
    // In server components, we can call the backend API directly
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
    const r = await fetch(`${backendUrl}/api/blog/posts/${encodeURIComponent(slug)}`, { 
      cache: "no-store",
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!r.ok) {
      console.error(`Blog post fetch failed: ${r.status} ${r.statusText}`);
      return null;
    }
    
    // Always read as text first, then parse JSON safely
    // This prevents errors if the response is HTML or plain text
    let text: string;
    try {
      text = await r.text();
    } catch (readError) {
      console.error('[Blog Post] Failed to read response body:', readError);
      return null;
    }
    
    if (!text || !text.trim()) {
      console.error('[Blog Post] Empty response body');
      return null;
    }
    
    // Check if response looks like JSON (starts with { or [)
    const trimmed = text.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      console.error(`[Blog Post] Response is not JSON. Content-Type: ${r.headers.get('content-type')}, Preview:`, trimmed.substring(0, 200));
      return null;
    }
    
    // Safely parse JSON
    let j;
    try {
      j = JSON.parse(text);
    } catch (parseError) {
      console.error('[Blog Post] JSON parse error:', parseError);
      console.error('[Blog Post] Response preview:', trimmed.substring(0, 200));
      return null;
    }
    
    if (!j || typeof j !== 'object') {
      console.error('[Blog Post] Invalid response format:', typeof j);
      return null;
    }
    
    if (!j.ok) {
      console.error('Blog post API error:', j.error);
      return null;
    }
    
    return j?.data ?? null;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) {
    return {
      title: 'Post Not Found | VirtualAddressHub Blog',
    };
  }
  return {
    title: `${post.title} | VirtualAddressHub Blog`,
    description: post.excerpt || 'Read this article on the VirtualAddressHub blog.',
    openGraph: {
      title: post.title,
      description: post.excerpt || 'Read this article on the VirtualAddressHub blog.',
      url: `https://virtualaddresshub.com/blog/${params.slug}`,
    },
  };
}

export default async function PostPage({ params }: { params: { slug: string }}) {
  const post = await getPost(params.slug);
  if (!post) return notFound();

  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main className="flex-1 relative z-0 w-full">
        <article className="max-w-3xl mx-auto px-4 py-10 prose prose-neutral">
          <h1 className="mb-2">{post.title}</h1>
          <div className="text-sm opacity-70 mb-8">{post.dateLong} · {post.readTime}</div>
          <MDXRemote source={post.content} components={mdxComponents} />
        </article>
      </main>
      <FooterWithNav />
    </div>
  );
}
