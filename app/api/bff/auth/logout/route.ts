import { NextRequest } from 'next/server'
import { proxy } from '@/app/api/_lib/proxy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    // forward CSRF header automatically via proxy
    return proxy(req, '/api/auth/logout')
}