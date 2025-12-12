import crypto from 'crypto';

// Prefer the official GoCardless env var names (GC_*), but support legacy names (GOCARDLESS_*)
// so existing deployments don't break.
const ACCESS_TOKEN = (process.env.GC_ACCESS_TOKEN ?? process.env.GOCARDLESS_ACCESS_TOKEN)?.trim();
const ENV = ((process.env.GC_ENVIRONMENT ?? process.env.GOCARDLESS_ENV ?? 'sandbox').trim()) as 'sandbox' | 'live';
const WEBHOOK_SECRET = (process.env.GC_WEBHOOK_SECRET ?? process.env.GOCARDLESS_WEBHOOK_SECRET)?.trim();
const APP_URL = (process.env.APP_URL ?? process.env.APP_BASE_URL)?.trim();

if (!ACCESS_TOKEN) throw new Error('GoCardless access token missing (set GC_ACCESS_TOKEN).');
if (!WEBHOOK_SECRET) throw new Error('GoCardless webhook secret missing (set GC_WEBHOOK_SECRET).');
if (!APP_URL) throw new Error('APP_URL/APP_BASE_URL missing (needed for GoCardless redirect URIs).');

const API_BASE = ENV === 'sandbox'
  ? 'https://api-sandbox.gocardless.com'
  : 'https://api.gocardless.com';

export type GcLink = { redirect_url: string };

// HTTP client for GoCardless API
async function gcRequest(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
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
export async function gcCreateBrfUrl(userId: number, redirectUri: string): Promise<GcLink> {
  try {
    // Step 1: Create billing request
    const billingRequest = await gcRequest('/billing_requests', 'POST', {
      billing_requests: {
        mandate_request: {
          scheme: 'bacs'
        },
        metadata: {
          user_id: String(userId)
        }
      }
    });

    // Step 2: Create billing request flow
    const brf = await gcRequest('/billing_request_flows', 'POST', {
      billing_request_flows: {
        links: {
          billing_request: billingRequest.billing_requests.id
        },
        redirect_uri: redirectUri
      }
    });

    return { redirect_url: brf.billing_request_flows.authorisation_url };
  } catch (error) {
    console.error('[GoCardless] Failed to create BRF URL:', error);
    throw new Error('Failed to create authorization link');
  }
}

// Create re-authorization link (same as update bank for now)
export async function gcCreateReauthoriseLink(userId: number): Promise<GcLink> {
  return gcCreateBrfUrl(userId, `${APP_URL}/billing`);
}

// Create update bank link
export async function gcCreateUpdateBankLink(userId: number): Promise<GcLink> {
  return gcCreateBrfUrl(userId, `${APP_URL}/billing`);
}

// Complete flow (when user returns from GoCardless)
export async function gcCompleteFlow(flowId: string): Promise<{ mandate_id: string }> {
  try {
    const flow = await gcRequest(`/billing_request_flows/${flowId}`);

    if (flow.billing_request_flows.state !== 'completed') {
      throw new Error('Flow not completed');
    }

    // Get the billing request to find the mandate
    const billingRequest = await gcRequest(`/billing_requests/${flow.billing_request_flows.links.billing_request}`);

    return { mandate_id: billingRequest.billing_requests.links.mandate };
  } catch (error) {
    console.error('[GoCardless] Failed to complete flow:', error);
    throw new Error('Failed to complete authorization');
  }
}

// Verify webhook signature
export function gcVerifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  if (!WEBHOOK_SECRET) return false;

  const mac = crypto.createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody, 'utf8')
    .digest('hex');

  return signatureHeader.includes(mac);
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
  const payment = await gcRequest(`/payments/${paymentId}`);
  return payment.payments;
}
