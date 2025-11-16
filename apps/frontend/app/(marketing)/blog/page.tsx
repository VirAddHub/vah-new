import type { Metadata } from 'next';
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
  const base = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
  const r = await fetch(`${base}/api/blog/posts`, { next: { revalidate: 300 } })
    .catch(() => null);
  if (!r || !r.ok) return [];
  const j = await r.json();
  return j?.data ?? [];
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
        <ul className="grid sm:grid-cols-2 gap-6">
          {posts.map((p: any) => (
            <li key={p.slug} className="border border-border rounded-xl p-4 bg-card">
              <a href={`/blog/${p.slug}`} className="text-base font-semibold text-foreground hover:text-primary">
                {p.title}
              </a>
              <p className="text-sm text-muted-foreground mt-1">{p.excerpt}</p>
              <div className="text-xs text-muted-foreground mt-2">
                {p.dateLong} · {p.readTime}
              </div>
            </li>
          ))}
        </ul>
      )}
      </main>
      <FooterWithNav />
    </div>
  );
}
