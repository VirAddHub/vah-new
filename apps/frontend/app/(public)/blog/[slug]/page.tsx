import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { parseJsonSafe } from '@/lib/http';
import { formatBlogDate } from '@/lib/blog-date-formatter';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import Link from 'next/link';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type BlogPost = {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  date?: string;
  dateLong?: string;
  updated?: string;
  tags?: string[];
  readTime?: string;
  content?: string;
  html?: string;
  authorName?: string;
  authorTitle?: string;
  authorImage?: string;
  cover?: string;
};

type BlogPostListItem = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  imageUrl: string;
};

const FALLBACK_ORIGIN = 'http://localhost:3000';

async function resolveAppBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
    if (host) {
      return `${proto === 'https' ? 'https' : 'http'}://${host}`;
    }
  } catch (_) {}
  const envUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    process.env.VERCEL_URL;
  if (!envUrl) return FALLBACK_ORIGIN;
  if (envUrl.startsWith('http')) return envUrl;
  return `https://${envUrl}`;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const base = await resolveAppBaseUrl();
    const url = `${base}/api/bff/blog/detail?slug=${encodeURIComponent(slug)}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      return null;
    }

    let json: any;
    try {
      json = await parseJsonSafe(res);
    } catch (err: any) {
      console.error('[BlogPostPage] Blog request failed with non-JSON response:', err);
      return null;
    }

    if (!json?.ok || !json?.data) return null;
    return json.data as BlogPost;
  } catch (error) {
    console.error('[BlogPostPage] Failed to fetch post', error);
    return null;
  }
}

async function getPopularPosts(currentSlug: string): Promise<BlogPostListItem[]> {
  try {
    const base = await resolveAppBaseUrl();
    const res = await fetch(
      `${base}/api/bff/blog/list`,
      {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      },
    );

    if (!res.ok) {
      return [];
    }

    let json: any;
    try {
      json = await parseJsonSafe(res);
    } catch (err: any) {
      console.error('[BlogPostPage] Failed to fetch popular posts:', err);
      return [];
    }

    if (!json?.ok || !json?.data) return [];
    
    // Filter out current post and take first 3
    const posts = (json.data as BlogPostListItem[])
      .filter(post => post.slug !== currentSlug)
      .slice(0, 3);
    
    return posts;
  } catch (error) {
    console.error('[BlogPostPage] Failed to fetch popular posts', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return {
      title: 'Post Not Found | VirtualAddressHub Blog',
    };
  }

  const description =
    post.description || post.excerpt || 'Read this article on the VirtualAddressHub blog.';

  return {
    title: `${post.title} | VirtualAddressHub Blog`,
    description,
    openGraph: {
      title: post.title,
      description,
      url: `https://virtualaddresshub.com/blog/${slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  const popularPosts = await getPopularPosts(slug);

  if (!post) {
    return notFound();
  }

  const hasHtml = typeof post.html === 'string' && post.html.trim().length > 0;

  return (
    <div className="bg-background">
        {/* Main Content Area */}
        <div className="max-w-[1440px] mx-auto px-6 lg:px-20 py-12 lg:py-20">
          <div className="flex gap-10 items-start">
            {/* Left Column - Main Content */}
            <div className="flex-1">
              <div className="flex flex-col items-center gap-12">
                {/* Back to blogs */}
                <div className="w-full max-w-[1172px] flex justify-start">
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-2 text-body font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    Back to blogs
                  </Link>
                </div>
                {/* Heading */}
                <h1 className="text-h1 lg:text-display text-foreground text-center max-w-[1172px]">
                  {post.title}
                </h1>

                {/* Featured Image */}
                {post.cover && (
                  <div className="w-full max-w-[1172px]">
                    <div className="relative w-full h-[549px] rounded-2xl overflow-hidden">
                      <ImageWithFallback
                        src={post.cover}
                        alt={post.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}

                {/* Article Content */}
                <div className="w-full max-w-[1172px]">
                  <div className="flex flex-col gap-5">
                    {hasHtml ? (
                      <article
                        className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground"
                        dangerouslySetInnerHTML={{ 
                          __html: (post.html as string).replace(
                            /<h2/g, 
                            '<h2 style="font-size: 1.5rem; font-weight: 500; line-height: 1.375; margin-bottom: 14px; margin-top: 20px;"'
                          ).replace(
                            /<p/g,
                            '<p style="font-size: 1.125rem; font-weight: 400; line-height: 1.4; margin-bottom: 20px;"'
                          ).replace(
                            /<ul/g,
                            '<ul style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; list-style: none; padding-left: 0;"'
                          ).replace(
                            /<li/g,
                            '<li style="display: flex; align-items: start; gap: 12px;"'
                          )
                        }}
                        suppressHydrationWarning
                      />
                    ) : (
                      <article 
                        className="prose prose-lg max-w-none"
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ node, children, ...props }) => (
                              <h2 
                                className="text-h2 font-medium text-foreground mb-3.5 mt-5" 
                                {...props}
                              >
                                {children}
                              </h2>
                            ),
                            p: ({ node, children, ...props }) => (
                              <p 
                                className="text-body-lg text-muted-foreground mb-5" 
                                {...props}
                              >
                                {children}
                              </p>
                            ),
                            ul: ({ node, children, ...props }) => (
                              <ul className="flex flex-col gap-2.5 mb-5" {...props}>
                                {children}
                              </ul>
                            ),
                            li: ({ node, children, ...props }) => (
                              <li className="flex items-start gap-3" {...props}>
                                <img
                                  src="/figma/check-16.svg"
                                  alt=""
                                  aria-hidden="true"
                                  className="h-4.5 w-4.5 flex-shrink-0 mt-0.5"
                                />
                                <span className="text-body-lg text-muted-foreground">{children}</span>
                              </li>
                            ),
                            img: ({ node, ...props }) => (
                              <img {...props} className="max-w-full h-auto rounded-2xl" />
                            ),
                          }}
                        >
                          {post.content ?? ""}
                        </ReactMarkdown>
                      </article>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Popular Articles Sidebar */}
            <div className="w-[417px] flex-shrink-0">
              <div className="flex flex-col gap-10">
                <div>
                  <h2 className="text-h1 lg:text-display text-foreground mb-4">
                    Popular Articles
                  </h2>
                  <div className="flex flex-col gap-5">
                    {popularPosts.map((popularPost) => (
                      <Link
                        key={popularPost.slug}
                        href={`/blog/${popularPost.slug}`}
                        className="flex gap-6 p-6 bg-muted rounded-xl hover:opacity-90 transition-opacity"
                      >
                        <div className="relative w-[191px] h-[174px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                          {popularPost.imageUrl?.trim() ? (
                            <ImageWithFallback
                              src={popularPost.imageUrl}
                              alt={popularPost.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-caption text-muted-foreground px-2 text-center">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-3.5 flex-1 min-w-0">
                          <div className="bg-card rounded-full px-2.5 py-0 text-caption text-muted-foreground inline-flex items-center justify-center w-fit">
                            {popularPost.category}
                          </div>
                          <div className="flex flex-col gap-2.5">
                            <h3 className="text-h3 font-medium text-foreground line-clamp-2">
                              {popularPost.title}
                            </h3>
                            <p className="text-body text-muted-foreground line-clamp-3">
                              {popularPost.excerpt}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA: solid primary card; avoid fixed Figma widths — cta-illustration.png is not shipped */}
        <div className="w-full border-t border-border bg-muted/40 py-12 lg:py-16 px-6 lg:px-20">
          <div className="max-w-[1280px] mx-auto">
            <div className="overflow-hidden rounded-2xl bg-primary px-8 py-10 lg:px-12 lg:py-12 shadow-md">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
                <div className="min-w-0 space-y-3 text-center lg:text-left lg:max-w-xl">
                  <h2 className="text-h1 lg:text-display font-semibold tracking-tight text-primary-foreground">
                    Get your London Business Address Today
                  </h2>
                  <p className="text-body text-primary-foreground/90">
                    Everything included for{' '}
                    <span className="font-medium text-primary-foreground">£9.99</span> per month.
                  </p>
                </div>
                <Link
                  href="/signup"
                  className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-white px-8 text-body font-medium uppercase text-primary transition-colors hover:bg-white/90 w-full lg:w-auto"
                >
                  Schedule London Address
                </Link>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
