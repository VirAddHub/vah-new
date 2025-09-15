// app/api/_lib/proxy.ts
import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_API_ORIGIN || 'http://localhost:4000'

export async function proxy(req: NextRequest, backendPath: string) {
    const url = new URL(backendPath, BACKEND)
    const init: RequestInit = {
        method: req.method,
        headers: new Headers(req.headers),
        body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
        redirect: 'manual',
    }

    // Ensure cookies/headers are forwarded correctly.
    // Forward x-csrf-token explicitly (case-insensitive pass-through already happens, but safe to keep).
    const h = init.headers as Headers
    h.set('host', url.host) // avoid host mismatch issues

    const res = await fetch(url, init)
    const data = await res.arrayBuffer()
    const out = new NextResponse(data, {
        status: res.status,
        statusText: res.statusText,
        headers: cleanHeaders(res.headers),
    })

    // Pass through Set-Cookie (critical for CSRF/session)
    const setCookies = res.headers.getSetCookie?.() ?? []
    for (const sc of setCookies) out.headers.append('set-cookie', sc)

    return out
}

function cleanHeaders(incoming: Headers) {
    const out = new Headers()
    incoming.forEach((v, k) => {
        // strip hop-by-hop and encoding that Next will reapply
        if (['content-encoding', 'transfer-encoding', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'upgrade'].includes(k.toLowerCase())) return
        out.set(k, v)
    })
    return out
}