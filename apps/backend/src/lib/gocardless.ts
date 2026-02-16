import crypto from 'crypto';

// Use a single canonical env var name to avoid deploy confusion.
// IMPORTANT: do not throw at import time; some environments intentionally run
// without GoCardless configured. Live API only (sandbox removed).
function getGcConfig() {
  const accessToken = (process.env.GC_ACCESS_TOKEN ?? process.env.GOCARDLESS_ACCESS_TOKEN)?.trim();
  const webhookSecret = process.env.GC_WEBHOOK_SECRET?.trim();
  const appUrl = (process.env.APP_URL ?? process.env.APP_BASE_URL)?.trim();
  const apiBase = 'https://api.gocardless.com';

  return { accessToken, webhookSecret, appUrl, apiBase };
}

export type GcLink = { redirect_url: string; flow_id: string; billing_request_id: string };

// HTTP client for GoCardless API
async function gcRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
  const { accessToken, apiBase } = getGcConfig();
  if (!accessToken) throw new Error('GoCardless access token missing (set GC_ACCESS_TOKEN).');

  const url = `${apiBase}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'GoCardless-Version': '2015-07-06',
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GoCardless API error: ${response.status} ${error}`);
  }

  return response.json();
}

// Create Billing Request Flow for both update bank and re-authorise
export async function gcCreateBrfUrl(
  userId: number,
  redirectUri: string,
  metadata?: Record<string, string>
): Promise<GcLink> {
  try {
    // Step 1: Create billing request
    const billingRequest = await gcRequest('/billing_requests', 'POST', {
      billing_requests: {
        mandate_request: {
          scheme: 'bacs'
        },
        metadata: {
          user_id: String(userId),
          ...(metadata || {})
        }
      }
    }) as any;

    // Step 2: Create billing request flow
    const brf = await gcRequest('/billing_request_flows', 'POST', {
      billing_request_flows: {
        links: {
          billing_request: billingRequest.billing_requests.id
        },
        redirect_uri: redirectUri
      }
    }) as any;

    return {
      redirect_url: brf.billing_request_flows.authorisation_url,
      flow_id: brf.billing_request_flows.id,
      billing_request_id: billingRequest.billing_requests.id,
    };
  } catch (error) {
    console.error('[GoCardless] Failed to create BRF URL:', error);
    throw new Error('Failed to create authorization link');
  }
}

// Create re-authorization link (same as update bank for now)
export async function gcCreateReauthoriseLink(userId: number): Promise<GcLink> {
  const { appUrl } = getGcConfig();
  if (!appUrl) throw new Error('APP_URL/APP_BASE_URL missing (needed for GoCardless redirect URIs).');
  return gcCreateBrfUrl(userId, `${appUrl}/billing`);
}

// Create update bank link
export async function gcCreateUpdateBankLink(userId: number): Promise<GcLink> {
  const { appUrl } = getGcConfig();
  if (!appUrl) throw new Error('APP_URL/APP_BASE_URL missing (needed for GoCardless redirect URIs).');
  return gcCreateBrfUrl(userId, `${appUrl}/billing`);
}

// Complete flow (when user returns from GoCardless)
export async function gcCompleteFlow(flowId: string): Promise<{ mandate_id: string; customer_id?: string }> {
  try {
    const flow = await gcRequest(`/billing_request_flows/${flowId}`) as any;

    if (flow.billing_request_flows.state !== 'completed') {
      throw new Error('Flow not completed');
    }

    // Get the billing request to find the mandate
    const billingRequest = await gcRequest(`/billing_requests/${flow.billing_request_flows.links.billing_request}`) as any;

    return {
      mandate_id: billingRequest.billing_requests.links.mandate,
      customer_id: billingRequest.billing_requests.links.customer,
    };
  } catch (error) {
    console.error('[GoCardless] Failed to complete flow:', error);
    throw new Error('Failed to complete authorization');
  }
}

export async function gcGetMandate(mandateId: string): Promise<{ customer_id?: string }> {
  const m = await gcRequest(`/mandates/${mandateId}`) as any;
  return { customer_id: m?.mandates?.links?.customer };
}

export async function gcCreatePayment(opts: {
  amountPence: number;
  currency?: string;
  mandateId: string;
  metadata?: Record<string, string>;
}): Promise<{ payment_id: string }> {
  const currency = (opts.currency ?? 'GBP').toUpperCase();
  const amountPence = Number(opts.amountPence);
  if (!Number.isFinite(amountPence) || amountPence <= 0) {
    throw new Error('Invalid amountPence for payment');
  }
  if (!opts.mandateId) throw new Error('Missing mandateId for payment');

  const payload = await gcRequest('/payments', 'POST', {
    payments: {
      amount: Math.round(amountPence),
      currency,
      links: { mandate: opts.mandateId },
      metadata: opts.metadata || undefined,
    },
  }) as any;

  const id = payload?.payments?.id;
  if (!id) throw new Error('GoCardless payment creation returned no id');
  return { payment_id: id };
}

// Verify webhook signature
export function gcVerifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const { webhookSecret } = getGcConfig();
  if (!webhookSecret) return false;

  const mac = crypto.createHmac('sha256', webhookSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // GoCardless sends the signature as a hex digest. Accept exact match or a list.
  return signatureHeader.split(',').map(s => s.trim()).includes(mac);
}

/**
 * Fetch payment details from GoCardless API
 */
export async function gcGetPayment(paymentId: string): Promise<{
  id: string;
  amount: number;
  currency: string;
  charge_date: string;
  links: {
    mandate?: string;
    subscription?: string;
    customer?: string;
  };
}> {
  const payment = await gcRequest(`/payments/${paymentId}`) as any;
  return payment.payments;
}
