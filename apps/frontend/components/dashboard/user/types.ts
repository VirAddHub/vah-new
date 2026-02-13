export interface MailItem {
  id: string | number;
  subject?: string;
  sender_name?: string;
  received_date?: string;
  received_at?: string; // Alternative date field name
  received_at_ms?: number | string; // Milliseconds timestamp (BIGINT from backend)
  status?: string;
  tag?: string;
  is_read?: boolean;
  created_at?: string | number; // Can be string or number (BIGINT from backend)
  scanned_at?: string;
  file_url?: string;
  deleted?: boolean; // Backend uses 'deleted' field for archived status
  gdpr_expired?: boolean; // GDPR 30-day expiration flag (from backend API)
  // Forwarding fields appear in some payloads
  forwarding_status?: unknown;
}

export interface DashboardSummaryCounts {
  newCount: number;
  needsForwardingCount: number;
}

/**
 * Minimal user profile shape used in the dashboard UI.
 * Keep permissive to avoid breaking legacy fields while still being typed.
 */
export interface DashboardUserProfile {
  id?: string | number;
  email?: string;
  company_name?: string;
  kyc_status?: string | null;
  owners_pending_info?: boolean;
  forwarding_address?: string;
  [key: string]: unknown;
}


