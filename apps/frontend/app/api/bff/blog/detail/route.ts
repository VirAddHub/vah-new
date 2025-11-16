import { NextRequest, NextResponse } from "next/server";

const ORIGIN = process.env.NEXT_PUBLIC_API_URL || 'https://vah-api-staging.onrender.com';

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ 
        ok: false, 
        error: "missing_slug",
        message: "Blog post slug is required" 
      }, { status: 400 });
    }
    
    const r = await fetch(`${ORIGIN}/api/blog/posts/${encodeURIComponent(slug)}`, { 
      cache: "no-store",
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // Always try to parse as JSON first, with defensive fallback
    let json: any;
    try {
      const contentType = r.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        // Clone response to read text without consuming
        const clonedResponse = r.clone();
        const text = await clonedResponse.text();
        console.error(`[BFF Blog Detail] Expected JSON but got ${contentType}. Response preview:`, text.substring(0, 200));
        return NextResponse.json(
          { 
            ok: false, 
            error: "invalid_backend_response",
            message: "Backend returned invalid response format" 
          },
          { status: 502 }
        );
      }
      
      json = await r.json();
    } catch (parseError) {
      console.error('[BFF Blog Detail] Failed to parse backend response as JSON:', parseError);
      // Try to read as text to see what we got
      try {
        const clonedResponse = r.clone();
        const text = await clonedResponse.text();
        console.error('[BFF Blog Detail] Backend response text:', text.substring(0, 200));
      } catch (e) {
        // Ignore
      }
      return NextResponse.json(
        { 
          ok: false, 
          error: "invalid_backend_response",
          message: "Backend returned invalid JSON" 
        },
        { status: 502 }
      );
    }
    
    // Ensure response has the expected shape
    if (typeof json !== 'object' || json === null) {
      console.error('[BFF Blog Detail] Backend returned non-object JSON:', typeof json);
      return NextResponse.json(
        { 
          ok: false, 
          error: "invalid_backend_response",
          message: "Backend returned invalid response format" 
        },
        { status: 502 }
      );
    }
    
    return NextResponse.json(json, { status: r.status });
  } catch (error) {
    console.error('[BFF Blog Detail] Unexpected error:', error);
    return NextResponse.json(
      { 
        ok: false, 
        error: "internal_error",
        message: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    );
  }
}
