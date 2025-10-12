export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextRequest } from 'next/server';
import { proxy } from '../../../../_lib/proxy';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const companyNumber = url.pathname.split('/').pop();
  
  if (!companyNumber) {
    return new Response(JSON.stringify({ ok: false, error: 'Company number required' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
  
  return proxy(req, `/api/companies-house/company/${companyNumber}`);
}
