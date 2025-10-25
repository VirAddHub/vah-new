import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "../mdx-components";

async function getPost(slug: string) {
  const base = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';
  const r = await fetch(`${base}/api/blog/posts/${encodeURIComponent(slug)}`, { cache: "no-store" });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.data ?? null;
}

export default async function PostPage({ params }: { params: { slug: string }}) {
  const post = await getPost(params.slug);
  if (!post) return notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 py-10 prose prose-neutral">
      <h1 className="mb-2">{post.title}</h1>
      <div className="text-sm opacity-70 mb-8">{post.dateLong} · {post.readTime}</div>
      <MDXRemote source={post.content} components={mdxComponents} />
    </article>
  );
}
