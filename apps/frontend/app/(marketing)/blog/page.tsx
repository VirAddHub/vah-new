// apps/frontend/app/(marketing)/blog/page.tsx

"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { HeaderWithNav } from "@/components/layout/HeaderWithNav";
import { FooterWithNav } from "@/components/layout/FooterWithNav";

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

type ListResponse =
  | {
      ok: true;
      data:
        | {
            posts: BlogPost[];
          }
        | BlogPost[];
    }
  | {
      ok: false;
      error?: string;
      message?: string;
    };

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setLoadError(null);

        // Use the local BFF route so we stay inside the frontend domain
        const res = await fetch("/api/bff/blog/list", {
          method: "GET",
        });

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("application/json")) {
          const text = await res.text().catch(() => "");
          if (cancelled) return;
          console.error(
            "[blog/page] Non-JSON from BFF",
            res.status,
            contentType,
            text.slice(0, 200)
          );
          setLoadError("We couldn't load the blog right now.");
          setPosts([]);
          return;
        }

        const json = (await res.json()) as ListResponse;

        if (!json.ok) {
          if (cancelled) return;
          console.error("[blog/page] BFF returned not ok:", json);
          setLoadError(json.message || "We couldn't load the blog right now.");
          setPosts([]);
          return;
        }

        // Accept either { data: { posts: [...] } } or { data: [...] }
        const raw =
          Array.isArray((json as any).data)
            ? ((json as any).data as BlogPost[])
            : ((json as any).data?.posts as BlogPost[] | undefined) ?? [];

        if (cancelled) return;
        setPosts(raw ?? []);
      } catch (err) {
        console.error("[blog/page] Error loading posts:", err);
        if (cancelled) return;
        setLoadError("We couldn't load the blog right now.");
        setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main className="flex-1 relative z-0 w-full max-w-5xl mx-auto px-4 py-12">
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl mb-6 text-primary">
          Blog
        </h1>
        <p className="text-sm text-muted-foreground mb-8">
          Practical guides, compliance updates, and mailroom tips for UK
          businesses using a virtual address.
        </p>

        {loading && (
          <p className="text-sm text-muted-foreground mb-6">
            Loading latest posts…
          </p>
        )}

        {loadError && !loading && (
          <div className="mb-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {loadError} Please try again in a few minutes.
          </div>
        )}

        {!loading && posts.length === 0 && !loadError && (
          <p className="text-sm text-muted-foreground">
            No blog posts are available yet. Check back soon — new articles are
            being added.
          </p>
        )}

        {!loading && posts.length > 0 && (
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
                          style={{ objectFit: "cover" }}
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
