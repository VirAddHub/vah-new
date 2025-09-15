// app/api/bff/[...path]/route.ts
import { NextRequest } from 'next/server'
import { proxy } from '@/app/api/_lib/proxy'
export const runtime = 'nodejs'

async function handler(req: NextRequest, ctx: { params: { path?: string[] } }) {
  const joined = (ctx.params.path ?? []).join('/')
  const path = '/api/' + joined // e.g. "ready" -> "/api/ready"
  return proxy(req, path)
}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as HEAD, handler as OPTIONS }