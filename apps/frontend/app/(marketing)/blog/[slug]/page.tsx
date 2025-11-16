import type { Metadata } from 'next';
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "../mdx-components";
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

async function getPost(slug: string) {
  try {
    // Use BFF route for better error handling
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
    
    const r = await fetch(`${baseUrl}/api/bff/blog/detail?slug=${encodeURIComponent(slug)}`, { 
      cache: "no-store",
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!r.ok) {
      console.error(`Blog post fetch failed: ${r.status} ${r.statusText}`);
      return null;
    }
    
    const contentType = r.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await r.text();
      console.error(`Expected JSON but got ${contentType}. Response:`, text.substring(0, 200));
      return null;
    }
    
    const j = await r.json();
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
