import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

function resolveAppBaseUrl() {
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
    const base = resolveAppBaseUrl();
    const res = await fetch(
      `${base}/api/bff/blog/detail?slug=${encodeURIComponent(slug)}`,
      {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      },
    );

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
    const base = resolveAppBaseUrl();
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
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);
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
      url: `https://virtualaddresshub.com/blog/${params.slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);
  const popularPosts = await getPopularPosts(params.slug);

  if (!post) {
    return notFound();
  }

  const hasHtml = typeof post.html === 'string' && post.html.trim().length > 0;

  return (
    <div className="bg-[#F6F6F7]">
        {/* Main Content Area */}
        <div className="max-w-[1440px] mx-auto px-[80px] py-[80px]">
          <div className="flex gap-[40px] items-start">
            {/* Left Column - Main Content */}
            <div className="flex-1">
              <div className="flex flex-col items-center gap-[48px]">
                {/* Heading */}
                <h1 className="text-[54px] font-medium text-[#1A1A1A] leading-[1.2] text-center max-w-[1172px]">
                  {post.title}
                </h1>

                {/* Featured Image */}
                {post.cover && (
                  <div className="w-full max-w-[1172px]">
                    <div className="relative w-full h-[549px] rounded-[30px] overflow-hidden">
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
                  <div className="flex flex-col gap-[20px]">
                    {hasHtml ? (
                      <article
                        className="prose prose-lg max-w-none"
                        style={{
                          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: (post.html as string).replace(
                            /<h2/g, 
                            '<h2 style="font-size: 24px; font-weight: 500; color: #1A1A1A; line-height: 1.375; margin-bottom: 14px; margin-top: 20px;"'
                          ).replace(
                            /<p/g,
                            '<p style="font-size: 18px; font-weight: 400; color: #666666; line-height: 1.4; margin-bottom: 20px;"'
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
                        style={{
                          fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                        }}
                      >
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            h2: ({ node, children, ...props }) => (
                              <h2 
                                className="text-[24px] font-medium text-[#1A1A1A] leading-[1.375] mb-[14px] mt-[20px]" 
                                {...props}
                              >
                                {children}
                              </h2>
                            ),
                            p: ({ node, children, ...props }) => (
                              <p 
                                className="text-[18px] font-normal text-[#666666] leading-[1.4] mb-[20px]" 
                                {...props}
                              >
                                {children}
                              </p>
                            ),
                            ul: ({ node, children, ...props }) => (
                              <ul className="flex flex-col gap-[10px] mb-[20px]" {...props}>
                                {children}
                              </ul>
                            ),
                            li: ({ node, children, ...props }) => (
                              <li className="flex items-start gap-[12px]" {...props}>
                                <img
                                  src="/figma/check-16.svg"
                                  alt=""
                                  aria-hidden="true"
                                  className="h-[18px] w-[18px] flex-shrink-0 mt-0.5"
                                />
                                <span className="text-[18px] font-normal text-[#666666] leading-[1.4]">{children}</span>
                              </li>
                            ),
                            img: ({ node, ...props }) => (
                              <img {...props} style={{ maxWidth: '100%', height: 'auto', borderRadius: '30px' }} />
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
              <div className="flex flex-col gap-[40px]">
                <div>
                  <h2 className="text-[44px] font-medium text-[#1A1A1A] leading-[1.2] mb-[18px]">
                    Popular Articles
                  </h2>
                  <div className="flex flex-col gap-[20px]">
                    {popularPosts.map((popularPost) => (
                      <Link
                        key={popularPost.slug}
                        href={`/blog/${popularPost.slug}`}
                        className="flex gap-[27px] p-[24px] bg-[#F9F9F9] rounded-[24px] hover:opacity-90 transition-opacity"
                      >
                        <div className="relative w-[191px] h-[174px] flex-shrink-0 rounded-[12px] overflow-hidden">
                          <ImageWithFallback
                            src={popularPost.imageUrl}
                            alt={popularPost.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col gap-[14px] flex-1 min-w-0">
                          <div className="bg-white rounded-[22px] px-[10px] py-0 text-[12px] font-normal text-[#666666] leading-[1.67] inline-flex items-center justify-center w-fit">
                            {popularPost.category}
                          </div>
                          <div className="flex flex-col gap-[10px]">
                            <h3 className="text-[20px] font-medium text-[#1A1A1A] leading-[1.4] line-clamp-2">
                              {popularPost.title}
                            </h3>
                            <p className="text-[16px] font-normal text-[#666666] leading-[1.4] line-clamp-3">
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

        {/* CTA Section */}
        <div className="w-full bg-[#014D3F] py-[80px] px-[80px]">
          <div className="max-w-[1280px] mx-auto">
            <div className="relative overflow-hidden rounded-[30px] bg-[#014D3F] p-0">
              <div className="grid md:grid-cols-[857px_1fr] gap-[40px] items-center">
                {/* London landmarks illustration on left */}
                <div className="relative w-full h-full min-h-[300px] md:min-h-[400px] flex items-center justify-center">
                  <img
                    src="/figma/cta-illustration.png"
                    alt="London landmarks: London Eye, Big Ben, Tower Bridge"
                    className="w-[857px] h-[817px] object-contain object-left"
                  />
                </div>
                {/* Content on right */}
                <div className="flex flex-col justify-center p-0 md:pl-0">
                  <h2 className="text-[44px] font-medium leading-[1.2] text-white">
                    Get your London Business Address Today
                  </h2>
                  <p className="mt-[12px] text-[16px] leading-[1.4] text-white/80">
                    Everything included for <span className="text-[#206039] font-normal">£9.99</span> per month.
                  </p>
                  <Link
                    href="/signup"
                    className="mt-[24px] w-[268px] h-[48px] rounded-[30px] bg-[#206039] px-[10px] py-[10px] text-[16px] font-medium text-[#024E40] hover:bg-[#206039]/90 transition-colors uppercase flex items-center justify-center"
                  >
                    Schedule London Address
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
