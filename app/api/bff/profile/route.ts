import { NextRequest } from 'next/server'
import { proxy } from '../../_lib/proxy'

export async function GET(req: NextRequest) {
    return proxy(req, '/profile')
}

export async function PUT(req: NextRequest) {
    const body = await req.json()
    return proxy(req, '/profile', { method: 'PUT', body: JSON.stringify(body) })
}
