import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';
import { requireBffAdmin } from '@/lib/server/requireBffAdmin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * POST /api/bff/admin/blog/revalidate
 * Invalidates Next.js cache for blog routes after admin edits.
 * Auth: session cookie and/or Authorization forwarded to backend /api/auth/whoami; must be admin.
 * Does not use REVALIDATE_SECRET — that is reserved for server-to-server POST /api/revalidate only.
 */
export async function POST(request: NextRequest) {
  try {
    const denied = await requireBffAdmin(request);
    if (denied) return denied;

    const body = (await request.json().catch(() => ({}))) as {
      tag?: string;
      path?: string;
      slug?: string;
    };
    const { tag, path, slug } = body;

    if (tag) {
      revalidateTag(tag);
    }
    if (path) {
      revalidatePath(path);
    }
    if (slug) {
      revalidatePath('/blog');
      revalidatePath(`/blog/${slug}`);
    }

    return NextResponse.json({
      ok: true,
      data: {
        revalidated: true,
        tag,
        path,
        slug,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    if (isBackendOriginConfigError(error)) {
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured' },
        { status: 500 },
      );
    }
    const message = error instanceof Error ? error.message : 'Revalidation failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
