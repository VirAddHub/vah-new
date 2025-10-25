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
    <main className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-semibold text-[#2E404D] mb-6">Blog</h1>
      {posts.length === 0 ? (
        <p className="opacity-70">No posts yet.</p>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-6">
          {posts.map((p: any) => (
            <li key={p.slug} className="border rounded-xl p-4">
              <a href={`/blog/${p.slug}`} className="text-lg font-semibold text-[#2E404D]">
                {p.title}
              </a>
              <p className="text-sm opacity-70 mt-1">{p.excerpt}</p>
              <div className="text-xs opacity-60 mt-2">
                {p.dateLong} · {p.readTime}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
