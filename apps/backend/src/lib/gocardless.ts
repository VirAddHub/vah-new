import crypto from 'crypto';

export type GcLink = { redirect_url: string };

const ACCESS_TOKEN = process.env.GC_ACCESS_TOKEN!;
const ENV = process.env.GC_ENVIRONMENT ?? 'live';
const WEBHOOK_SECRET = process.env.GC_WEBHOOK_SECRET!;
const APP_URL = process.env.APP_URL!;

// TODO: swap for real HTTP calls to GoCardless REST API (Billing Requests or Redirect Flow)
export async function gcCreateReauthoriseLink(userId: number): Promise<GcLink> {
  // Create a hosted flow for a NEW mandate (reauthorise)
  // Return hosted page URL
  return { redirect_url: `${APP_URL}/mock-gc/reauthorise/${userId}` };
}

export async function gcCreateUpdateBankLink(userId: number): Promise<GcLink> {
  // Either create a billing request flow / redirect flow
  return { redirect_url: `${APP_URL}/mock-gc/update-bank/${userId}` };
}

// Called after user returns from GC (complete the flow -> receive mandate_id)
export async function gcCompleteFlow(flowId: string): Promise<{ mandate_id: string }> {
  // Exchange flowId -> mandate_id via GC API
  return { mandate_id: `MD_${flowId}_example` };
}

// Verify webhook signature header, return true/false
export function gcVerifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  hmac.update(rawBody, 'utf8');
  const digest = hmac.digest('hex');
  // header may include scheme, do a basic match
  return signatureHeader.includes(digest);
}
