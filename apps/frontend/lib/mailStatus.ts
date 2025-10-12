// apps/frontend/lib/mailStatus.ts
// Shared constants for mail forwarding statuses and transitions

export const MAIL_STATUS = {
  Requested: "Requested",
  Processing: "Processing", 
  Dispatched: "Dispatched",
  Delivered: "Delivered",
  Cancelled: "Cancelled",
} as const;

export type MailStatus = typeof MAIL_STATUS[keyof typeof MAIL_STATUS];

export const ALLOWED_TRANSITIONS: Record<MailStatus, MailStatus[]> = {
  [MAIL_STATUS.Requested]: [MAIL_STATUS.Processing, MAIL_STATUS.Cancelled],
  [MAIL_STATUS.Processing]: [MAIL_STATUS.Dispatched, MAIL_STATUS.Cancelled],
  [MAIL_STATUS.Dispatched]: [MAIL_STATUS.Delivered],
  [MAIL_STATUS.Delivered]: [],
  [MAIL_STATUS.Cancelled]: [],
};

// Helper to normalize any status string to canonical form
export function normalizeStatus(status: string): MailStatus {
  const normalized = (status || "").toLowerCase().trim();
  
  switch (normalized) {
    case "requested":
      return MAIL_STATUS.Requested;
    case "processing":
      return MAIL_STATUS.Processing;
    case "dispatched":
      return MAIL_STATUS.Dispatched;
    case "delivered":
      return MAIL_STATUS.Delivered;
    case "cancelled":
    case "canceled": // Handle both spellings
      return MAIL_STATUS.Cancelled;
    default:
      throw new Error(`Invalid status: ${status}`);
  }
}

// Helper to check if a transition is allowed
export function isTransitionAllowed(from: MailStatus, to: MailStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// Helper to get all possible next statuses for a given status
export function getNextStatuses(current: MailStatus): MailStatus[] {
  return ALLOWED_TRANSITIONS[current];
}
