// apps/frontend/app/(marketing)/blog/page.tsx

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

export const metadata: Metadata = {
  title: "Blog | VirtualAddressHub",
  description:
    "Guides, compliance updates, and practical advice on running a UK company with a virtual address.",
};

type BlogPost = {
  id: number | string;
  title: string;
  slug: string;
  excerpt?: string | null;
  description?: string | null;
  content?: string | null;
  status?: string | null;
  published_at?: string | null;
  dateLong?: string | null;
  readTime?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  cover?: string | null;
};

async function loadPosts(): Promise<{ ok: boolean; posts: BlogPost[] }> {
  const backendBase =
    process.env.BACKEND_API_ORIGIN?.replace(/\/$/, "") ||
    "https://vah-api-staging.onrender.com/api";

  try {
    const res = await fetch(`${backendBase}/blog/posts`, {
      // Cache for a bit; adjust as you like
      next: { revalidate: 300 },
    });

    const contentType = res.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      const text = await res.text().catch(() => "");
      console.error(
        "[blog/page] Upstream did not return JSON",
        res.status,
        contentType,
        text.slice(0, 200)
      );
      return { ok: false, posts: [] };
    }

    const json = await res.json();

    if (!json?.ok) {
      console.error("[blog/page] Upstream JSON not ok:", json);
      return { ok: false, posts: [] };
    }

    // Backend returns { ok: true, data: [...] } where data is an array
    const posts: BlogPost[] = json.data?.posts ?? json.data ?? [];
    return { ok: true, posts };
  } catch (err) {
    console.error("[blog/page] Error loading posts:", err);
    return { ok: false, posts: [] };
  }
}

export default async function BlogPage() {
  const { ok, posts } = await loadPosts();

  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main className="flex-1 relative z-0 w-full max-w-5xl mx-auto px-4 py-12">
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl mb-6 text-primary">
          Blog
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Practical guides, compliance updates, and mailroom tips for UK businesses using a virtual address.
        </p>

        {!ok && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            We're having trouble loading the latest posts right now. Please try again in a few minutes.
          </div>
        )}

        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No blog posts are available yet. Check back soon — new articles are being added.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {posts.map((post) => {
              const imageUrl = post.imageUrl ?? post.cover ?? null;
              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block h-full rounded-xl border border-border bg-card overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:border-primary/50"
                >
                  <article className="flex h-full flex-col">
                    {imageUrl && (
                      <div className="relative h-48 w-full overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={post.title}
                          width={800}
                          height={400}
                          className="object-cover transition duration-300 group-hover:scale-105 w-full h-full"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {post.category || "General"}
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                          {post.title}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {post.excerpt || post.description || ""}
                      </p>
                      <div className="mt-auto text-xs text-muted-foreground">
                        {post.dateLong || ""}
                        {post.readTime ? ` · ${post.readTime}` : ""}
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <FooterWithNav />
    </div>
  );
}
