import { NextRequest, NextResponse } from 'next/server'

const BASE = process.env.BACKEND_API_ORIGIN || 'http://localhost:4000/api'

export async function proxy(req: NextRequest, path: string, init?: RequestInit) {
    const cookie = req.headers.get('cookie') || ''
    const url = `${BASE}${path}`
    const r = await fetch(url, {
        ...init,
        headers: { ...(init?.headers || {}), 'cookie': cookie, 'content-type': 'application/json' }
    } as any)
    const body = await r.text()
    return new NextResponse(body, { status: r.status, headers: { 'content-type': r.headers.get('content-type') || 'application/json' } })
}
