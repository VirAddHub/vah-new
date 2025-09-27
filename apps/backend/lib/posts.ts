import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type PostFrontMatter = {
    title: string;
    description?: string;
    date: string;           // ISO
    updated?: string;
    tags?: string[];
    cover?: string;
    status?: "draft" | "published";
    ogTitle?: string;
    ogDesc?: string;
    noindex?: boolean;
};
export type Post = { slug: string; frontMatter: PostFrontMatter; content: string; };

const POSTS_DIR = path.join(process.cwd(), "content", "blog");

export function getAllPostSlugs(): string[] {
    if (!fs.existsSync(POSTS_DIR)) return [];
    return fs.readdirSync(POSTS_DIR).filter(f => f.endsWith(".mdx")).map(f => f.replace(/\.mdx$/, ""));
}

export function getPostBySlug(slug: string): Post | null {
    const filePath = path.join(POSTS_DIR, `${slug}.mdx`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(raw);
    const fm = data as PostFrontMatter;
    fm.status ??= "published";
    fm.tags ??= [];
    return { slug, frontMatter: fm, content };
}

export function getAllPosts(includeDrafts = false): Post[] {
    return getAllPostSlugs()
        .map(s => getPostBySlug(s)!)
        .filter(Boolean)
        .filter(p => includeDrafts || p.frontMatter.status !== "draft")
        .sort((a, b) => new Date(b.frontMatter.date).getTime() - new Date(a.frontMatter.date).getTime());
}

export const POSTS_PER_PAGE = 10;
export function paginatePosts(page: number) {
    const posts = getAllPosts(false);
    const total = posts.length;
    const lastPage = Math.max(1, Math.ceil(total / POSTS_PER_PAGE));
    const current = Math.min(Math.max(1, page), lastPage);
    const start = (current - 1) * POSTS_PER_PAGE;
    return { total, lastPage, current, items: posts.slice(start, start + POSTS_PER_PAGE) };
}
