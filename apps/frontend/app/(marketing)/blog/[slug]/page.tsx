import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';
import { parseJsonSafe } from '@/lib/http';
import { formatBlogDate } from '@/lib/blog-date-formatter';

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

  if (!post) {
    return notFound();
  }

  const publishedDate = post.dateLong ?? post.date ?? '';
  const details = [publishedDate, post.readTime].filter(Boolean).join(' · ');
  const hasHtml = typeof post.html === 'string' && post.html.trim().length > 0;

  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main id="main-content" role="main" className="flex-1 relative z-0 w-full">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-semibold text-foreground mb-6">
            {post.title}
          </h1>

          {/* Post Meta Information */}
          <div className="text-sm text-muted-foreground space-y-1 mb-8">
            {post.updated && post.updated !== post.date && (
              <div>
                <span className="font-medium">Updated On:</span>{' '}
                {formatBlogDate(post.updated)}
              </div>
            )}
            <div>
              <span className="font-medium">Published:</span>{' '}
              {formatBlogDate(post.date)}
            </div>
            <div>
              <span className="font-medium">by</span>{' '}
              <span>{post.authorName || "Liban Adan"}</span>
              {post.tags && post.tags.length > 0 && (
                <>
                  {' '}
                  <span className="font-medium">in</span>{' '}
                  <span>{post.tags[0]}</span>
                </>
              )}
            </div>
          </div>

          {hasHtml ? (
            <article
              className="prose prose-neutral max-w-none mt-8"
              dangerouslySetInnerHTML={{ __html: post.html as string }}
              suppressHydrationWarning
            />
          ) : (
            <article className="prose prose-neutral max-w-none mt-8">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  img: ({ node, ...props }) => (
                    <img {...props} style={{ maxWidth: '100%', height: 'auto' }} />
                  ),
                }}
              >
                {post.content ?? ""}
              </ReactMarkdown>
            </article>
          )}

          {/* Author Signature Block */}
          <footer className="mt-10 border-t pt-6 flex items-center gap-4">
            <img
              src={post.authorImage || "/images/authors/liban.jpg"}
              alt={post.authorName || "Liban Adan"}
              className="h-12 w-12 rounded-full object-cover"
            />
            <div>
              <p className="font-semibold">{post.authorName || "Liban Adan"}</p>
              <p className="text-sm text-muted-foreground">
                {post.authorTitle || "Founder, VirtualAddressHub"}
              </p>
            </div>
          </footer>
        </div>
      </main>
      <FooterWithNav />
    </div>
  );
}
