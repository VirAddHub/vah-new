import { NextRequest } from 'next/server';
import { proxy } from '@/app/api/_lib/proxy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// The signed-in customer's company declaration (the API checks who is signed in).
export async function GET(req: NextRequest) {
  return proxy(req, '/account/company-declaration');
}
export async function POST(req: NextRequest) {
  return proxy(req, '/account/company-declaration');
}
