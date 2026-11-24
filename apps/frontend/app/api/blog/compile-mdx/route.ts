import { NextRequest, NextResponse } from "next/server";
import { serialize } from "next-mdx-remote/serialize";
import { getBackendOrigin } from "@/lib/server/backendOrigin";

export const runtime = "nodejs";

const MAX_SOURCE_CHARS = 200_000;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,199}$/i;

/**
 * Compiles a PUBLISHED blog post for the legacy client-side blog page.
 *
 * The caller sends only a slug; the MDX source is fetched server-side from the public blog API,
 * so anonymous callers can no longer compile arbitrary content (security review F03).
 * Errors return a fixed message, not compiler output.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  }

  let source = "";
  try {
    const res = await fetch(`${getBackendOrigin()}/api/blog/posts/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "not_found" }, { status: res.status === 404 ? 404 : 502 });
    }
    const json = await res.json().catch(() => null);
    const content = json?.data?.content;
    source = typeof content === "string" ? content : "";
  } catch {
    return NextResponse.json({ error: "blog_unavailable" }, { status: 502 });
  }

  if (source.length > MAX_SOURCE_CHARS) {
    return NextResponse.json({ error: "post_too_large" }, { status: 413 });
  }

  try {
    const serialized = await serialize(source);
    return NextResponse.json(serialized, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ error: "Failed to render article" }, { status: 500 });
  }
}
