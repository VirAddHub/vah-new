export type SubscriptionSummary = {
  plan_name: string;
  price_label: string; // e.g. "£9.99"
  billing_period: "monthly" | "annual";
  status: "active" | "cancelled" | "past_due" | "unknown";
};

export type BusinessContactInfo = {
  first_name: string;
  middle_names?: string;
  last_name: string;
  phone?: string;
  email: string;
};

export type Address = {
  formatted: string; // multiline string
};

export type BusinessOwner = {
  id: string | number;
  first_name: string;
  middle_names?: string;
  last_name: string;
  dob?: string; // ISO date
  email?: string;

  shares_percent?: number;
  votes_percent?: number;
  can_appoint_majority?: boolean;

  requires_verification?: boolean;
  status: "verified" | "pending" | "not_started";

  proof_of_address_status?: "verified" | "missing" | "pending";
  id_status?: "verified" | "missing" | "pending";
};

export type InvoiceRow = {
  invoice_no: string;
  description: string;
  total_label: string; // e.g. "£21.60"
  status: "paid" | "not_paid" | "void" | "unknown";
  date_label: string; // e.g. "31 Jul 23"
  download_url?: string;
};

export type AccountPageData = {
  subscription: SubscriptionSummary;
  contact: BusinessContactInfo;
  forwarding_address?: Address | null;
  business_address?: Address | null; // display only, never delete
  owners: BusinessOwner[];
  invoices: InvoiceRow[];
};
