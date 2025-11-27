import type { Metadata } from 'next';
import Link from 'next/link';
import Image from "next/image";
import { HeaderWithNav } from '@/components/layout/HeaderWithNav';
import { FooterWithNav } from '@/components/layout/FooterWithNav';

export const metadata: Metadata = {
  title: 'Blog | VirtualAddressHub',
  description: 'Expert insights on virtual business addresses, UK company formation, HMRC compliance, mail forwarding, and business tips from VirtualAddressHub.',
  openGraph: {
    title: 'Blog | VirtualAddressHub',
    description: 'Expert insights on virtual business addresses, UK company formation, HMRC compliance, and mail forwarding.',
    url: 'https://virtualaddresshub.com/blog',
  },
};

export const revalidate = 300;

async function getPosts() {
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || 
                 process.env.NEXT_PUBLIC_BASE_URL || 
                 'http://localhost:3000';
    const res = await fetch(`${base}/api/bff/blog/list`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[blog/page] BFF returned non-ok status:", res.status);
      return [];
    }

    const json = await res.json();

    if (!json.ok) {
      console.error("[blog/page] BFF returned error:", json.error);
      return [];
    }

    // Backend returns { ok: true, data: [...] } where data is an array
    return json.data ?? [];
  } catch (error) {
    console.error("[blog/page] Error fetching blog posts:", error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <div className="min-h-screen flex flex-col relative">
      <HeaderWithNav />
      <main className="flex-1 relative z-0 w-full max-w-5xl mx-auto px-4 py-12">
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl mb-6 text-primary">Blog</h1>
        {posts.length === 0 ? (
          <p className="opacity-70 text-muted-foreground">No posts yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {posts.map((p: any) => {
              const imageUrl = p.imageUrl ?? p.cover ?? null;
              return (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group block h-full rounded-xl border border-border bg-card overflow-hidden transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 hover:border-primary/50"
                >
                  <article className="flex h-full flex-col">
                    {imageUrl && (
                      <div className="relative h-48 w-full overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={p.title}
                          fill
                          className="object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {p.category || "General"}
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                          {p.title}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {p.excerpt || p.description || ""}
                      </p>
                      <div className="mt-auto text-xs text-muted-foreground">
                        {p.dateLong || ""}
                        {p.readTime ? ` · ${p.readTime}` : ""}
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
