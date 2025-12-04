export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; code?: number; errorCode?: string };
export type ApiResponse<T> = ApiOk<T> | ApiErr;

export const isOk = <T,>(r: ApiResponse<T>): r is ApiOk<T> => r.ok === true;

// Forwarding types
export type CreateForwardingPayload = {
  mail_item_id: number;
  to_name: string;
  address1: string;
  address2?: string | null;
  city: string;
  state?: string | null;
  postal: string;
  country?: string;
  reason?: string | null;
  method?: 'standard' | 'priority';
};

export type ForwardingResponse = {
  forwarding_request: any;
  pricing: 'free' | 'billable_200';
  mail_tag: string;
  charge_amount: number;
};
