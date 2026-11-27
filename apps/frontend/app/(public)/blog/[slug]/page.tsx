import { jsonLdScript } from '@/lib/jsonLd';
import { OG_IMAGES } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { parseJsonSafe } from '@/lib/http';
import { formatBlogDate } from '@/lib/blog-date-formatter';
import Link from 'next/link';
import m from '@/components/marketing/Marketing.module.css';
import s from '@/components/marketing/ResourceEditorial.module.css';
import { getBackendOrigin } from '@/lib/server/backendOrigin';

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

/**
 * Server-side reads go straight to the API's configured origin, never to a host taken from request
 * headers (security review R47). The BFF blog routes pass the same JSON through unchanged.
 */
function blogApiBase(): string {
  return `${getBackendOrigin()}/api/blog/posts`;
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const res = await fetch(`${blogApiBase()}/${encodeURIComponent(slug)}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    let json: any;
    try {
      json = await parseJsonSafe(res);
    } catch {
      return null;
    }
    if (!json?.ok || !json?.data) return null;
    return json.data as BlogPost;
  } catch {
    return null;
  }
}

async function getRelatedPosts(currentSlug: string): Promise<BlogPostListItem[]> {
  try {
    const res = await fetch(blogApiBase(), {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return [];
    let json: any;
    try {
      json = await parseJsonSafe(res);
    } catch {
      return [];
    }
    if (!json?.ok || !json?.data) return [];
    return (json.data as BlogPostListItem[]).filter((p) => p.slug !== currentSlug).slice(0, 3);
  } catch {
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
  if (!post) return { title: 'Post Not Found | VirtualAddressHub Blog' };
  const description =
    post.description || post.excerpt || 'Read this article on the VirtualAddressHub blog.';
  return {
    title: `${post.title} | VirtualAddressHub Blog`,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
    images: post.cover ? [{ url: post.cover, alt: post.title }] : OG_IMAGES, title: post.title, description, url: `/blog/${slug}`, type: 'article' },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  const relatedPosts = await getRelatedPosts(slug);

  if (!post) return notFound();

  const dateLabel = formatBlogDate(post.dateLong || post.date || post.updated);
  const categoryLabel = post.tags && post.tags.length > 0 ? post.tags[0] : null;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description || post.excerpt,
    url: `https://virtualaddresshub.co.uk/blog/${slug}`,
    datePublished: post.date,
    dateModified: post.updated || post.date,
    author: { '@type': 'Person', name: post.authorName || 'Liban Adan' },
    publisher: { '@type': 'Organization', name: 'VirtualAddressHub' },
    image: post.cover,
    articleSection: categoryLabel || 'General',
  };

  return (
    <div className={`${m.site} ${s.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(structuredData) }}
      />
      <header className={s.articleHeader}>
        <div className={m.wrap}>
          <Link className={m.textlink} href="/blog">
            ← Blog
          </Link>
          <div className={s.meta}>
            {categoryLabel && <span>{categoryLabel}</span>}
            {dateLabel && <span>{dateLabel}</span>}
            {post.readTime && <span>{post.readTime}</span>}
          </div>
          <h1>{post.title}</h1>
          <p className={m.lead}>{post.description || post.excerpt}</p>
        </div>
      </header>
      <div className={`${m.wrap} ${s.articleLayout}`}>
        <aside className={s.articleAside}>
          <p>FROM THE JOURNAL</p>
          <Link href="/blog">Browse the library</Link>
          <Link href="/help">Looking for account help?</Link>
        </aside>
        <article className={s.articleBody}>
          {post.cover && <img src={post.cover} alt="" className={s.articleCover} />}
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{ h1: ({ children }) => <h2>{children}</h2> }}
          >
            {post.content ?? ''}
          </ReactMarkdown>
          <Link className={m.textlink} href="/blog">
            ← Back to guides & articles
          </Link>
        </article>
      </div>
      {relatedPosts.length > 0 && (
        <section className={s.related}>
          <div className={m.wrap}>
            <p className={m.kicker}>CONTINUE READING</p>
            {relatedPosts.map((p) => (
              <Link key={p.slug} href={`/blog/${encodeURIComponent(p.slug)}`}>
                {p.title} →
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
