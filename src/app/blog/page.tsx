import Link from "next/link";
import { getAllPosts, POSTS_PER_PAGE } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const revalidate = false;

export default function BlogIndex() {
    const posts = getAllPosts();
    console.log("Blog posts loaded:", posts.length, posts.map(p => p.slug));
    const firstPage = posts.slice(0, POSTS_PER_PAGE);

    return (
        <main className="mx-auto max-w-3xl px-4 py-12">
            <h1 className="text-3xl font-semibold mb-6">Blog</h1>
            <ul className="space-y-8">
                {firstPage.map(p => (
                    <li key={p.slug} className="border-b pb-6">
                        <Link href={`/blog/${p.slug}`} className="text-xl font-medium hover:underline">
                            {p.frontMatter.title}
                        </Link>
                        <div className="text-sm text-neutral-500 mt-1">
                            {new Date(p.frontMatter.date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                        {p.frontMatter.description && <p className="mt-2 text-neutral-700">{p.frontMatter.description}</p>}
                    </li>
                ))}
            </ul>
            {posts.length > POSTS_PER_PAGE && (
                <div className="mt-10">
                    <Link href="/blog/page/2" className="underline">Older posts →</Link>
                </div>
            )}
        </main>
    );
}
