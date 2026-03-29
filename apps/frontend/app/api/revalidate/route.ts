export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

/**
 * Server-to-server or automation only.
 *
 * - Secret: `REVALIDATE_SECRET` (server env only). Never `NEXT_PUBLIC_*` — that would ship to browsers.
 * - Header: `x-revalidate-secret` must match (constant-time compare).
 * - Admin UI: use POST `/api/bff/admin/blog/revalidate` (session + backend whoami); it does not use this secret.
 */
function readRevalidateSecretHeader(req: NextRequest): string | undefined {
  const h = req.headers.get('x-revalidate-secret');
  if (typeof h === 'string' && h.length > 0) return h;
  return undefined;
}

function revalidateSecretsMatch(expected: string, provided: string | undefined): boolean {
  if (!expected || !provided) return false;
  try {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tag, path, slug } = body;

    const expectedSecret = process.env.REVALIDATE_SECRET?.trim() ?? '';
    const provided = readRevalidateSecretHeader(req);

    if (!expectedSecret || !revalidateSecretsMatch(expectedSecret, provided)) {
      return NextResponse.json({ ok: false, error: 'Invalid revalidate secret' }, { status: 401 });
    }

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
    const message = error instanceof Error ? error.message : 'Revalidation failed';
    if (process.env.NODE_ENV !== 'production') {
      console.error('[revalidate] Error:', error);
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
