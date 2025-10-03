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
  sender_name?: string | null;
  received_at: string;       // canonical ISO name
  status: MailStatus;
  tag?: string | null;
  scan_url?: string | null;  // if present on list API
  is_read?: boolean | null;
}

export interface MailItemDetails extends MailItem {
  file_size?: number | null;
  notes?: string | null;
  pages?: number | null;
}
