export type MailStatus =
  | 'unread'
  | 'read'
  | 'received'
  | 'scanned'
  | 'forward_requested'
  | 'archived'
  | 'deleted';

export interface MailItem {
  id: string;                // always string in FE
  subject: string;
  description?: string | null; // mail description
  sender_name?: string | null;
  received_at: string;       // canonical ISO name
  status: MailStatus;
  tag?: string | null;
  scan_url?: string | null;  // if present on list API
  is_read?: boolean | null;
  gdpr_expired?: boolean;    // GDPR 30-day expiration flag
}

export interface MailItemDetails extends MailItem {
  file_size?: number | null;
  notes?: string | null;
  pages?: number | null;
}
