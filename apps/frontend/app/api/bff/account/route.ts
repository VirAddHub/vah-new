import { NextRequest, NextResponse } from 'next/server';
import { getBackendOrigin } from '@/lib/server/backendOrigin';
import { isBackendOriginConfigError } from '@/lib/server/isBackendOriginError';

/**
 * BFF endpoint that aggregates account data from multiple backend endpoints
 * Returns AccountPageData structure
 */
export async function GET(request: NextRequest) {
  const routePath = '/api/bff/account';
  let backendBase = '';
  
  try {
    const cookie = request.headers.get('cookie') || '';
    const backend = getBackendOrigin();
    backendBase = backend;

    // Fetch data from multiple endpoints in parallel
    const [overviewRes, invoicesRes, userRes, profileRes] = await Promise.all([
      fetch(`${backend}/api/billing/overview`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch((e) => {
        console.error(`[BFF account] Failed to fetch billing/overview:`, e);
        return null;
      }),
      fetch(`${backend}/api/billing/invoices?page=1&page_size=12`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch((e) => {
        console.error(`[BFF account] Failed to fetch billing/invoices:`, e);
        return null;
      }),
      fetch(`${backend}/api/auth/whoami`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch((e) => {
        console.error(`[BFF account] Failed to fetch auth/whoami:`, e);
        return null;
      }),
      fetch(`${backend}/api/profile`, {
        headers: { 'Cookie': cookie, 'Content-Type': 'application/json' },
      }).catch((e) => {
        console.error(`[BFF account] Failed to fetch profile:`, e);
        return null;
      }),
    ]);

    // Read responses as text first, then parse JSON
    let overview: any = null;
    let invoices: any = null;
    let user: any = null;
    let profile: any = null;

    try {
      overview = overviewRes?.ok ? await overviewRes.text().then(raw => {
        try { return JSON.parse(raw); } catch (e) { 
          console.warn('[BFF account] Failed to parse overview JSON:', e);
          return { raw: raw.substring(0, 300) }; 
        }
      }).catch((e) => {
        console.warn('[BFF account] Failed to read overview response:', e);
        return null;
      }) : null;
    } catch (e) {
      console.warn('[BFF account] Error processing overview:', e);
    }

    try {
      invoices = invoicesRes?.ok ? await invoicesRes.text().then(raw => {
        try { return JSON.parse(raw); } catch (e) { 
          console.warn('[BFF account] Failed to parse invoices JSON:', e);
          return { raw: raw.substring(0, 300) }; 
        }
      }).catch((e) => {
        console.warn('[BFF account] Failed to read invoices response:', e);
        return null;
      }) : null;
    } catch (e) {
      console.warn('[BFF account] Error processing invoices:', e);
    }

    try {
      user = userRes?.ok ? await userRes.text().then(raw => {
        try { return JSON.parse(raw); } catch (e) { 
          console.warn('[BFF account] Failed to parse user JSON:', e);
          return { raw: raw.substring(0, 300) }; 
        }
      }).catch((e) => {
        console.warn('[BFF account] Failed to read user response:', e);
        return null;
      }) : null;
    } catch (e) {
      console.warn('[BFF account] Error processing user:', e);
    }

    try {
      profile = profileRes?.ok ? await profileRes.text().then(raw => {
        try { return JSON.parse(raw); } catch (e) { 
          console.warn('[BFF account] Failed to parse profile JSON:', e);
          return { raw: raw.substring(0, 300) }; 
        }
      }).catch((e) => {
        console.warn('[BFF account] Failed to read profile response:', e);
        return null;
      }) : null;
    } catch (e) {
      console.warn('[BFF account] Error processing profile:', e);
    }

    const o = overview?.data;
    const userData = user?.data?.user;
    const profileData = profile?.data;
    const invoicesRaw = invoices?.data?.items || [];

    // Build AccountPageData structure
    // Get price from billing overview, or fallback to most recent paid invoice
    let pricePence = o?.current_price_pence;
    if (!pricePence || pricePence === 0) {
      // Try to get price from most recent paid invoice
      const recentPaidInvoice = invoicesRaw.find((inv: any) => inv.status === 'paid');
      if (recentPaidInvoice?.amount_pence) {
        pricePence = recentPaidInvoice.amount_pence;
      }
    }
    
    const priceLabel = pricePence && pricePence > 0 
      ? `£${(pricePence / 100).toFixed(2)}`
      : 'Price not available';

    const subscription = {
      plan_name: o?.plan || 'Digital Mailbox Plan',
      price_label: priceLabel,
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
    // Format: address_line2 (if exists), address_line1, city postal_code
    // Example:
    //   Second Floor, Tanner Place
    //   54–58 Tanner Street
    //   London SE1 3PH
    const business_address = (profileData?.address_line1 || profileData?.city)
      ? {
        formatted: (() => {
          const lines: string[] = [];
          
          // Line 1: address_line2 (if exists, e.g., "Second Floor, Tanner Place")
          if (profileData?.address_line2?.trim()) {
            lines.push(profileData.address_line2.trim());
          }
          
          // Line 2: address_line1 (street address, e.g., "54–58 Tanner Street")
          if (profileData?.address_line1?.trim()) {
            lines.push(profileData.address_line1.trim());
          }
          
          // Line 3: city postal_code (e.g., "London SE1 3PH")
          const cityPostal = [
            profileData?.city?.trim(),
            profileData?.postal_code?.trim()
          ].filter(Boolean).join(' ');
          
          if (cityPostal) {
            lines.push(cityPostal);
          }
          
          return lines.join('\n');
        })()
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
      console.error(`[BFF account] Server misconfigured: ${error.message}`);
      return NextResponse.json(
        { ok: false, error: 'Server misconfigured', details: error.message },
        { status: 500 }
      );
    }
    console.error(`[BFF account] Exception in route ${routePath}:`, error);
    console.error(`[BFF account] Backend base was: ${backendBase}`);
    console.error(`[BFF account] Error stack:`, error?.stack);
    return NextResponse.json(
      { 
        ok: false, 
        error: { 
          code: 'BFF_EXCEPTION', 
          message: error?.message,
          route: routePath 
        }
      },
      { status: 500 }
    );
  }
}
