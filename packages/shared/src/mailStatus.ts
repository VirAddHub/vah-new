// packages/shared/src/mailStatus.ts
// Single source of truth for mail forwarding statuses and transitions

export const MAIL_STATUS = {
  Requested: "Requested",
  Processing: "Processing", 
  Dispatched: "Dispatched",
  Delivered: "Delivered",
} as const;

export type MailStatus = typeof MAIL_STATUS[keyof typeof MAIL_STATUS];

export const ALLOWED: Record<MailStatus, MailStatus[]> = {
  [MAIL_STATUS.Requested]: [MAIL_STATUS.Processing],
  [MAIL_STATUS.Processing]: [MAIL_STATUS.Dispatched],
  [MAIL_STATUS.Dispatched]: [MAIL_STATUS.Delivered],
  [MAIL_STATUS.Delivered]: [],
};

// Helper to normalize any status string to canonical form
export const toCanonical = (s: string): MailStatus => {
  const x = (s || "").toLowerCase().trim();
  
  switch (x) {
    case "requested":
      return MAIL_STATUS.Requested;
    case "processing":
      return MAIL_STATUS.Processing;
    case "dispatched":
      return MAIL_STATUS.Dispatched;
    case "delivered":
      return MAIL_STATUS.Delivered;
    default:
      throw new Error(`invalid_status: ${s}`);
  }
};

// Helper to check if a transition is allowed
export function isTransitionAllowed(from: MailStatus, to: MailStatus): boolean {
  return ALLOWED[from].includes(to);
}

// Helper to get all possible next statuses for a given status
export function getNextStatuses(current: MailStatus): MailStatus[] {
  return ALLOWED[current];
}
