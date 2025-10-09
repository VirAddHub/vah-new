export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { tag, path, slug } = body;
    
    // Verify secret for security
    const secret = req.headers.get('x-revalidate-secret');
    const expectedSecret = process.env.REVALIDATE_SECRET;
    
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: 'Invalid revalidate secret' }, { status: 401 });
    }

    // Revalidate by tag (for blog posts)
    if (tag) {
      revalidateTag(tag);
      console.log(`[revalidate] Tag "${tag}" revalidated`);
    }

    // Revalidate by path (for specific pages)
    if (path) {
      revalidatePath(path);
      console.log(`[revalidate] Path "${path}" revalidated`);
    }

    // Revalidate blog-specific paths
    if (slug) {
      revalidatePath('/blog');
      revalidatePath(`/blog/${slug}`);
      console.log(`[revalidate] Blog post "${slug}" revalidated`);
    }

    return NextResponse.json({ 
      ok: true, 
      data: { 
        revalidated: true, 
        tag, 
        path, 
        slug,
        timestamp: new Date().toISOString()
      } 
    });

  } catch (error: any) {
    console.error('[revalidate] Error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error?.message || 'Revalidation failed' 
    }, { status: 500 });
  }
}
