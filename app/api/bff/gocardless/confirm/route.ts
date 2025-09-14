import { NextRequest, NextResponse } from 'next/server'
const BASE = process.env.BACKEND_API_ORIGIN || 'http://localhost:4000/api'
export async function POST(req: NextRequest) {
    const body = await req.json()
    const r = await fetch(`${BASE}/billing/mandate/confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' } as any)
    const j = await r.json()
    return NextResponse.json(j, { status: r.status })
}
