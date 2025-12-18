import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * BFF endpoint that aggregates account data from multiple backend endpoints
 * Returns AccountPageData structure
 */
export async function GET(request: NextRequest) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();

    // Fetch data from multiple endpoints in parallel
    const [overviewRes, invoicesRes, userRes, profileRes] = await Promise.all([
      fetch(`${backend}/api/billing/overview`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch(() => null),
      fetch(`${backend}/api/billing/invoices?page=1&page_size=12`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch(() => null),
      fetch(`${backend}/api/auth/whoami`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch(() => null),
      fetch(`${backend}/api/profile`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch(() => null),
    ]);

    const overview = overviewRes?.ok ? await overviewRes.json().catch(() => null) : null;
    const invoices = invoicesRes?.ok ? await invoicesRes.json().catch(() => null) : null;
    const user = userRes?.ok ? await userRes.json().catch(() => null) : null;
    const profile = profileRes?.ok ? await profileRes.json().catch(() => null) : null;

    const o = overview?.data;
    const userData = user?.data?.user;
    const profileData = profile?.data;
    const invoicesRaw = invoices?.data?.items || [];

    // Build AccountPageData structure
    const subscription = {
      plan_name: o?.plan || 'Digital Mailbox Plan',
      price_label: o?.current_price_pence ? `£${(o.current_price_pence / 100).toFixed(2)}` : '£9.99',
      billing_period: (o?.cadence === 'yearly' || o?.cadence === 'annual') ? 'annual' : 'monthly',
      status: o?.status === 'active' ? 'active' : o?.status === 'cancelled' ? 'cancelled' : o?.status === 'past_due' ? 'past_due' : 'unknown'
    };

    const contact = {
      first_name: profileData?.first_name || userData?.first_name || '',
      middle_names: profileData?.middle_names || '',
      last_name: profileData?.last_name || userData?.last_name || '',
      phone: profileData?.phone || userData?.phone || '',
      email: profileData?.email || userData?.email || ''
    };

    // SAFETY: Never overwrite existing addresses
    const forwarding_address = profileData?.forwarding_address || userData?.forwarding_address
      ? { formatted: profileData?.forwarding_address || userData?.forwarding_address || '' }
      : null;

    // SAFETY: Preserve business_address if it exists (display only, never delete)
    const business_address = (profileData?.address_line1 || profileData?.city)
      ? {
        formatted: [
          profileData?.address_line1,
          profileData?.address_line2,
          profileData?.city,
          profileData?.postal_code,
          profileData?.country
        ].filter(line => line && line.trim() !== '').join('\n')
      }
      : null;

    // Transform invoices (BFF invoices route already normalizes pdf_url to BFF endpoint)
    const invoiceRows = invoicesRaw.map((inv: any) => ({
      invoice_no: inv.invoice_number || inv.id?.toString() || 'N/A',
      description: inv.description || 'Subscription payment',
      total_label: inv.amount_pence ? `£${(inv.amount_pence / 100).toFixed(2)}` : '£0.00',
      status: inv.status === 'paid' ? 'paid' : inv.status === 'void' ? 'void' : inv.status === 'failed' ? 'failed' : 'not_paid',
      date_label: inv.date ? new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : 'N/A',
      download_url: inv.pdf_url || inv.download_url || (inv.id ? `/api/bff/billing/invoices/${inv.id}/download` : null)
    }));

    const accountData = {
      subscription,
      contact,
      forwarding_address,
      business_address,
      owners: [], // TODO: Fetch from PSC API when available
      invoices: invoiceRows
    };

    return NextResponse.json({ ok: true, data: accountData });
  } catch (error: any) {
    // Handle backend origin configuration errors
    if (isBackendOriginConfigError(error)) {
      console.error('[BFF account] Server misconfigured:', error.message);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured: BACKEND_API_ORIGIN is not set or invalid' },
        { status: 500 }
      );
    }
    console.error('[BFF account] error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch account data' },
      { status: 500 }
    );
  }
}
