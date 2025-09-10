import Link from "next/link";
import { paginatePosts } from "@/lib/posts";

export const dynamic = "force-dynamic";
export const revalidate = false;

type Props = { params: { page: string } };
export function generateStaticParams() {
    return Array.from({ length: 20 }, (_, i) => ({ page: String(i + 1) }));
}

export default function BlogPage({ params }: Props) {
    const n = Number(params.page || "1");
    const { items, current, lastPage } = paginatePosts(n);

    return (
        <main className="mx-auto max-w-3xl px-4 py-12">
            <h1 className="text-3xl font-semibold mb-6">Blog — Page {current}</h1>
            <ul className="space-y-8">
                {items.map(p => (
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
            <nav className="mt-10 flex items-center justify-between">
                {current > 1 ? <Link href={`/blog/page/${current - 1}`} className="underline">← Newer</Link> : <span />}
                {current < lastPage ? <Link href={`/blog/page/${current + 1}`} className="underline">Older →</Link> : <span />}
            </nav>
        </main>
    );
}
