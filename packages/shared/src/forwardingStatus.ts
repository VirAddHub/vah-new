// packages/shared/src/forwardingStatus.ts
export type ForwardingStatus = 'requested'|'in_progress'|'dispatched'|'cancelled';

export const FWD_STATUS: Record<ForwardingStatus, ForwardingStatus> = {
  requested: 'requested',
  in_progress: 'in_progress',
  dispatched: 'dispatched',
  cancelled: 'cancelled',
};

export const FWD_LABEL: Record<ForwardingStatus, string> = {
  requested: 'Requested',
  in_progress: 'In Progress',
  dispatched: 'Dispatched',
  cancelled: 'Cancelled',
};

const NORMALISE = (s: string) =>
  s.toLowerCase().trim().replace(/[\s-]+/g, '_'); // "In Progress", "in-progress" → in_progress

const ALIASES: Record<string, ForwardingStatus> = {
  requested: 'requested',
  request: 'requested',
  inprogress: 'in_progress',
  in_progress: 'in_progress',
  'in progress': 'in_progress',
  dispatched: 'dispatched',
  shipped: 'dispatched',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

export function parseForwardingStatus(input: unknown): ForwardingStatus {
  if (typeof input !== 'string') throw new Error('invalid_status: missing');
  const key = NORMALISE(input);
  const hit = ALIASES[key] ?? (FWD_STATUS as any)[key];
  if (!hit) throw new Error(`invalid_status: ${input}`);
  return hit;
}
