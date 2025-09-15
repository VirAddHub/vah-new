// app/api/bff/auth/csrf/route.ts
import { NextRequest } from 'next/server'
import { proxy } from '@/app/api/_lib/proxy'
export const runtime = 'nodejs'

// Backend exposes /api/csrf; we alias it to /api/bff/auth/csrf
export function GET(req: NextRequest) {
    return proxy(req, '/api/csrf')
}
