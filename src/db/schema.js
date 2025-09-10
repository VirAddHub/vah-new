const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  first_name TEXT,
  last_name TEXT,
  forwarding_address TEXT,
  kyc_status TEXT,
  plan_status TEXT,
  one_drive_folder_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  kyc_updated_at BIGINT,
  company_name TEXT,
  companies_house_number TEXT,
  sumsub_applicant_id TEXT,
  sumsub_review_status TEXT,
  sumsub_last_updated BIGINT,
  sumsub_rejection_reason TEXT,
  sumsub_webhook_payload TEXT,
  plan_start_date BIGINT,
  onboarding_step TEXT
);

CREATE TABLE IF NOT EXISTS mail_item (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  subject TEXT,
  received_date DATE,
  scan_file_url TEXT,
  file_size INT,
  forwarded_physically BOOLEAN DEFAULT false,
  notes TEXT,
  forwarded_date DATE,
  forward_reason TEXT,
  sender_name TEXT,
  scanned BOOLEAN DEFAULT false,
  deleted BOOLEAN DEFAULT false,
  tag TEXT,
  is_billable_forward BOOLEAN DEFAULT false,
  admin_note TEXT,
  deleted_by_admin BOOLEAN DEFAULT false,
  action_log JSONB,
  scanned_at BIGINT,
  status TEXT,
  requested_at BIGINT
);

CREATE TABLE IF NOT EXISTS payment (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  user_id INT REFERENCES "user"(id) ON DELETE CASCADE,
  gocardless_customer_id TEXT,
  subscription_id TEXT,
  status TEXT,
  invoice_url TEXT,
  mandate_id TEXT
);

CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
  action TEXT,
  details TEXT,
  mail_item_id INT REFERENCES mail_item(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_log (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  admin_user_id INT REFERENCES "user"(id) ON DELETE SET NULL,
  action_type TEXT,
  target_type TEXT,
  target_id INT,
  details JSONB
);

CREATE TABLE IF NOT EXISTS forwarding_request (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  "user" INT REFERENCES "user"(id) ON DELETE CASCADE,
  mail_item INT REFERENCES mail_item(id) ON DELETE CASCADE,
  requested_at BIGINT,
  status TEXT,
  payment INT REFERENCES payment(id) ON DELETE SET NULL,
  is_billable BOOLEAN,
  billed_at BIGINT,
  destination_name TEXT,
  destination_address TEXT,
  source TEXT
);

CREATE TABLE IF NOT EXISTS mail_event (
  id SERIAL PRIMARY KEY,
  created_at BIGINT NOT NULL,
  mail_item INT REFERENCES mail_item(id) ON DELETE CASCADE,
  actor_user INT REFERENCES "user"(id) ON DELETE SET NULL,
  event_type TEXT,
  details JSONB
);

CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_mail_item_user ON mail_item(user_id);
CREATE INDEX IF NOT EXISTS idx_mail_item_status ON mail_item(status);
CREATE INDEX IF NOT EXISTS idx_forwarding_req_user ON forwarding_request("user");
CREATE INDEX IF NOT EXISTS idx_mail_event_mail ON mail_event(mail_item);
`;

module.exports = { BOOTSTRAP_SQL };
