import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type BlogPost = {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  date?: string;
  dateLong?: string;
  readTime?: string;
  content?: string;
  html?: string;
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

    const json = await res.json().catch(() => null);
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
      <main className="flex-1 relative z-0 w-full">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <p className="text-sm text-muted-foreground">{details}</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            {post.title}
          </h1>
          {post.description && (
            <p className="mt-3 text-lg text-muted-foreground">
              {post.description}
            </p>
          )}

          {hasHtml ? (
            <article
              className="prose prose-neutral max-w-none mt-8"
              dangerouslySetInnerHTML={{ __html: post.html as string }}
            />
          ) : (
            <article className="prose prose-neutral max-w-none mt-8">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content ?? ""}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </main>
      <FooterWithNav />
    </div>
  );
}
