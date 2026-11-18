-- Dummy data in the shapes found on Render (counts are smaller). Password for all: Journey!Passw0rd#1
\set ON_ERROR_STOP on
INSERT INTO plans (name, slug, description, price_pence, interval, currency, features_json, active, vat_inclusive, trial_days, sort, effective_at, created_at, updated_at, amount_pence)
VALUES ('Virtual Mailbox - Monthly','virtual-mailbox-monthly','London Business Address',999,'month','GBP','[]',true,true,0,1,now()::text,now()::text,now()::text,999),
       ('Virtual Mailbox - Annual','virtual-mailbox-annual','London Business Address',8999,'year','GBP','[]',true,true,0,2,now()::text,now()::text,now()::text,8999)
ON CONFLICT DO NOTHING;
WITH t AS (SELECT (EXTRACT(EPOCH FROM now())*1000)::bigint AS ms)
INSERT INTO "user" (email, password, first_name, last_name, company_name, is_admin, role, status, plan_status, kyc_status, is_sole_controller, plan_id, created_at, updated_at, last_login_at)
SELECT e, '$2b$10$XBBHiJS3GmHDuZ54jz2OpeRH65xtiAeO77Ch0qxWrIiSEnK0xnen2', f, 'Render', c, false, 'user', s, ps, k, true,
       (SELECT id FROM plans WHERE slug='virtual-mailbox-monthly'), t.ms, t.ms, NULL
FROM t, (VALUES
  ('rl.gocardless@example.test','Gc','Gc Ltd','active','active','approved'),
  ('rl.pending@example.test','Pending','Pending Ltd','pending_payment','pending_payment','pending'),
  ('rl.nobusiness@example.test','Nobiz','Nobiz Ltd','active','inactive','pending'),
  ('rl.verified@example.test','Verified','Verified Ltd','active','active','verified')
) v(e,f,c,s,ps,k);
INSERT INTO business (user_id, company_name, status, is_primary, monthly_price_pence, created_at, updated_at)
SELECT id, company_name, 'active', true, 999, created_at, created_at FROM "user" WHERE email IN ('rl.gocardless@example.test','rl.pending@example.test','rl.verified@example.test');
INSERT INTO subscription (user_id, status, mandate_id, plan_name, cadence)
SELECT id, CASE WHEN email IN ('rl.gocardless@example.test','rl.verified@example.test') THEN 'active' ELSE 'pending' END,
       CASE WHEN email IN ('rl.gocardless@example.test','rl.verified@example.test') THEN 'MD_DUMMY_' || id END, 'Virtual Mailbox - Monthly', 'monthly'
FROM "user" WHERE email LIKE 'rl.%@example.test';
UPDATE "user" SET gocardless_mandate_id = 'MD_DUMMY_' || id WHERE email IN ('rl.gocardless@example.test','rl.verified@example.test');
INSERT INTO mail_item (user_id, business_id, subject, sender_name, tag, status, scan_file_url, created_at, received_at_ms, idempotency_key)
SELECT u.id, b.id, 'HMRC letter', 'HMRC', 'hmrc', 'received', 'http://127.0.0.1:4020/scan.pdf', (EXTRACT(EPOCH FROM now())*1000)::bigint, (EXTRACT(EPOCH FROM now())*1000)::bigint, 'rl-' || u.id
FROM "user" u JOIN business b ON b.user_id = u.id WHERE u.email LIKE 'rl.%@example.test';
