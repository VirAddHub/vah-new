import { NextResponse } from 'next/server'
const BASE = process.env.BACKEND_API_ORIGIN || 'http://localhost:4000/api'
export async function POST() {
    const r = await fetch(`${BASE}/billing/mandate/create`, { method: 'POST', credentials: 'include' } as any)
    const j = await r.json()
    return NextResponse.json(j, { status: r.status })
}
