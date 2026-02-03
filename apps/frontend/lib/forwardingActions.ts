import { MAIL_STATUS, toCanonical } from './mailStatus';

export function actionFor(next: string): string {
  const s = toCanonical(next);
  if (s === MAIL_STATUS.Requested) return "mark_reviewed";
  if (s === MAIL_STATUS.Processing) return "start_processing";
  if (s === MAIL_STATUS.Dispatched) return "mark_dispatched";
  if (s === MAIL_STATUS.Delivered) return "mark_delivered";
  throw new Error(`No action for status: ${s}`);
}

export async function updateForwardingByAction(id: string, next: string) {
  const action = actionFor(next);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://vah-api-staging.onrender.com';

  const res = await fetch(`${API_BASE}/api/admin/forwarding/requests/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  });

  let payload: any = null;
  if (!res.ok) {
    try {
      payload = await res.json();
    } catch { }
    const err: any = new Error(payload?.message || `Request failed with status ${res.status}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return res.json();
}
