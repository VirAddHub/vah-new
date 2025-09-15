import { NextRequest } from 'next/server'
import { proxy } from '@/app/api/_lib/proxy'

export const runtime = 'nodejs'

export function GET(req: NextRequest) {
    return proxy(req, '/api/auth/whoami')
}
