import { NextRequest } from 'next/server'
import { proxy } from '@/app/api/_lib/proxy'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
    return proxy(req, '/api/auth/login')
}