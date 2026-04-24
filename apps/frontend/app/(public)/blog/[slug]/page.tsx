import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseJsonSafe } from '@/lib/http';
import { formatBlogDate } from '@/lib/blog-date-formatter';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import Link from 'next/link';

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

async function getRelatedPosts(currentSlug: string): Promise<BlogPostListItem[]> {
  try {
    const base = await resolveAppBaseUrl();
    const res = await fetch(`${base}/api/bff/blog/list`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      return [];
    }

    let json: any;
    try {
      json = await parseJsonSafe(res);
    } catch (err: any) {
      console.error('[BlogPostPage] Failed to fetch related posts:', err);
      return [];
    }

    if (!json?.ok || !json?.data) return [];

    return (json.data as BlogPostListItem[])
      .filter((post) => post.slug !== currentSlug)
      .slice(0, 3);
  } catch (error) {
    console.error('[BlogPostPage] Failed to fetch related posts', error);
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

function ArticleMeta({
  dateLabel,
  categoryLabel,
  readTime,
}: {
  dateLabel: string;
  categoryLabel: string | null;
  readTime?: string;
}) {
  const parts: string[] = [];
  if (dateLabel) parts.push(dateLabel);
  if (categoryLabel) parts.push(categoryLabel);
  if (readTime?.trim()) parts.push(readTime.trim());

  if (parts.length === 0) return null;

  return (
    <p className="text-caption text-muted-foreground">{parts.join(' · ')}</p>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  const relatedPosts = await getRelatedPosts(slug);

  if (!post) {
    return notFound();
  }

  const hasHtml = typeof post.html === 'string' && post.html.trim().length > 0;
  const dateLabel = formatBlogDate(post.dateLong || post.date || post.updated);
  const categoryLabel =
    post.tags && post.tags.length > 0 ? post.tags[0] : null;

  return (
    <div className="bg-background">
      <article className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-12">
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-2 text-caption font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to blog
        </Link>

        <header className="mb-10 border-b border-border pb-10">
          <ArticleMeta dateLabel={dateLabel} categoryLabel={categoryLabel} readTime={post.readTime} />
          <h1 className="mt-4 text-pretty text-h1 font-semibold tracking-tight text-foreground lg:text-[2rem] lg:leading-tight">
            {post.title}
          </h1>
          {post.excerpt || post.description ? (
            <p className="mt-4 max-w-2xl text-body-lg leading-relaxed text-muted-foreground">
              {post.excerpt || post.description}
            </p>
          ) : null}
        </header>

        {post.cover ? (
          <div className="mb-10 overflow-hidden rounded-xl border border-border bg-muted/30">
            <div className="relative aspect-[2/1] w-full max-h-[min(56vh,420px)] sm:max-h-[480px]">
              <ImageWithFallback
                src={post.cover}
                alt={post.title}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        ) : null}

        <div className="blog-article-body max-w-[65ch]">
          {hasHtml ? (
            <div
              className="blog-article-html"
              dangerouslySetInnerHTML={{ __html: post.html as string }}
              suppressHydrationWarning
            />
          ) : (
            <div className="space-y-1">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children, ...props }) => (
                    <h2
                      className="mb-3 mt-10 text-xl font-semibold tracking-tight text-foreground first:mt-0 sm:text-2xl"
                      {...props}
                    >
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3
                      className="mb-2 mt-8 text-lg font-semibold tracking-tight text-foreground sm:text-xl"
                      {...props}
                    >
                      {children}
                    </h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p
                      className="mb-6 text-[1.0625rem] leading-[1.75] text-foreground/90 last:mb-0"
                      {...props}
                    >
                      {children}
                    </p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="mb-6 list-disc space-y-2 pl-5 text-[1.0625rem] leading-relaxed text-foreground/90 marker:text-muted-foreground" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol className="mb-6 list-decimal space-y-2 pl-5 text-[1.0625rem] leading-relaxed text-foreground/90 marker:text-muted-foreground" {...props}>
                      {children}
                    </ol>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="pl-1" {...props}>
                      {children}
                    </li>
                  ),
                  a: ({ children, ...props }) => (
                    <a className="font-medium text-primary underline underline-offset-4 hover:text-primary/90" {...props}>
                      {children}
                    </a>
                  ),
                  strong: ({ children, ...props }) => (
                    <strong className="font-semibold text-foreground" {...props}>
                      {children}
                    </strong>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote
                      className="my-6 border-l-2 border-primary/40 pl-4 text-foreground/85 italic"
                      {...props}
                    >
                      {children}
                    </blockquote>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isBlock = className?.includes('language-');
                    if (isBlock) {
                      return (
                        <code className={className} {...props}>
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code
                        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children, ...props }) => (
                    <pre
                      className="mb-6 overflow-x-auto rounded-lg border border-border bg-muted/50 p-4 text-sm"
                      {...props}
                    >
                      {children}
                    </pre>
                  ),
                  img: ({ alt, className, ...props }) => (
                    // eslint-disable-next-line @next/next/no-img-element -- markdown images are external/unknown URLs
                    <img
                      {...props}
                      alt={alt ?? ''}
                      className={`my-8 w-full max-w-full rounded-lg border border-border ${className ?? ''}`}
                    />
                  ),
                }}
              >
                {post.content ?? ''}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </article>

      {relatedPosts.length > 0 ? (
        <section
          className="border-t border-border bg-muted/20 px-4 py-14 sm:px-6 lg:px-8 lg:py-20"
          aria-labelledby="related-heading"
        >
          <div className="mx-auto max-w-3xl lg:max-w-5xl">
            <h2 id="related-heading" className="text-h2 font-semibold tracking-tight text-foreground">
              Related articles
            </h2>
            <p className="mt-2 text-body-sm text-muted-foreground">More from the blog</p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {relatedPosts.map((related) => (
                <li key={related.slug}>
                  <Link
                    href={`/blog/${related.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/25 hover:bg-card/80"
                  >
                    <div className="relative aspect-[16/10] w-full bg-muted">
                      {related.imageUrl?.trim() ? (
                        <ImageWithFallback
                          src={related.imageUrl}
                          alt={related.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-caption text-muted-foreground">
                          No cover
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      {related.category ? (
                        <span className="w-fit rounded-full bg-muted px-2.5 py-0.5 text-caption text-muted-foreground">
                          {related.category}
                        </span>
                      ) : null}
                      <h3 className="text-body-lg font-semibold leading-snug text-foreground group-hover:text-primary">
                        {related.title}
                      </h3>
                      <p className="line-clamp-2 flex-1 text-body-sm leading-relaxed text-muted-foreground">
                        {related.excerpt}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <div className="border-t border-border px-4 py-10 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-3xl text-center text-body-sm text-muted-foreground">
          Running a UK business?{' '}
          <Link href="/signup" className="font-medium text-primary underline underline-offset-4 hover:text-primary/90">
            Get a London business address
          </Link>
        </p>
      </div>
    </div>
  );
}
