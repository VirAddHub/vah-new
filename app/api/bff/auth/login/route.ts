import { NextRequest } from 'next/server'
import { proxy } from '../../_lib/proxy'

export async function POST(req: NextRequest) {
    const body = await req.json()
    return proxy(req, '/auth/login', { method: 'POST', body: JSON.stringify(body) })
}
