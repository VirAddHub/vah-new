export type User = {
  id: number; email: string; first_name?: string; last_name?: string;
  kyc_status?: string; plan_status?: string; is_admin?: number;
  created_at: number;
};

export type MailItem = {
  id: number; user_id: number; subject?: string; sender_name?: string;
  status: 'received'|'scanned'|'forward_requested'|'forwarded'|'deleted';
  created_at: number; scan_file_url?: string; tag?: string;
};
