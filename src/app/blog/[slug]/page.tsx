import Link from "next/link";
import type { Metadata } from "next";
import { getAllPostSlugs, getPostBySlug } from "@/lib/posts";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

type Props = { params: { slug: string } };

export const dynamic = "force-dynamic";
export const revalidate = false;

export function generateStaticParams() {
    try {
        return getAllPostSlugs().map(slug => ({ slug }));
    } catch (error) {
        console.warn("Failed to generate static params for blog posts:", error);
        return [];
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const post = getPostBySlug(params.slug);
    if (!post) return { title: "Not found" };
    const title = post.frontMatter.ogTitle || post.frontMatter.title;
    const description = post.frontMatter.ogDesc || post.frontMatter.description || "";
    const noindex = post.frontMatter.noindex === true || post.frontMatter.status === "draft";
    return {
        title,
        description,
        alternates: { canonical: `/blog/${post.slug}` },
        robots: { index: !noindex, follow: !noindex, googleBot: { index: !noindex } },
        openGraph: { title, description, type: "article", url: `/blog/${post.slug}` },
        twitter: { card: "summary_large_image", title, description },
    };
}

export default async function BlogPost({ params }: Props) {
    const post = getPostBySlug(params.slug);
    if (!post || post.frontMatter.status === "draft") {
        return (
            <main className="mx-auto max-w-3xl px-4 py-12">
                <h1 className="text-2xl font-semibold">Post not found</h1>
                <Link href="/blog" className="underline mt-4 inline-block">← Back to Blog</Link>
            </main>
        );
    }

    const { content } = await compileMDX({
        source: post.content,
        options: {
            parseFrontmatter: false,
            mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]] },
        },
        components: {}, // add shortcodes later if you want
    });

    return (
        <main className="mx-auto max-w-3xl px-4 py-12">
            <article>
                <header className="mb-8">
                    <h1 className="text-3xl font-semibold">{post.frontMatter.title}</h1>
                    <div className="text-sm text-neutral-500 mt-2">
                        {new Date(post.frontMatter.date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
                        {post.frontMatter.updated && <> • Updated {new Date(post.frontMatter.updated).toLocaleDateString("en-GB")}</>}
                    </div>
                </header>
                <div className="prose max-w-none prose-img:rounded-xl">{content}</div>
            </article>

            <hr className="my-10" />
            <nav className="flex justify-between">
                <Link href="/blog" className="underline">← Back to Blog</Link>
                <Link href="/plans" className="underline">See Plans & Pricing →</Link>
            </nav>
        </main>
    );
}
