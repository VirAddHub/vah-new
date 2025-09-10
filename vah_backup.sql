PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      forwarding_address TEXT,
      kyc_status TEXT DEFAULT 'pending',
      plan_status TEXT DEFAULT 'active',
      one_drive_folder_url TEXT,
      is_admin INTEGER DEFAULT 0,
      kyc_updated_at INTEGER,
      company_name TEXT,
      companies_house_number TEXT,
      sumsub_applicant_id TEXT,
      sumsub_review_status TEXT,
      sumsub_last_updated INTEGER,
      sumsub_rejection_reason TEXT,
      sumsub_webhook_payload TEXT,
      plan_start_date INTEGER,
      onboarding_step TEXT DEFAULT 'signup',
      gocardless_customer_id TEXT,
      gocardless_subscription_id TEXT,
      mandate_id TEXT,
      last_login_at INTEGER,
      login_attempts INTEGER DEFAULT 0,
      locked_until INTEGER,
      updated_at INTEGER
    , password_reset_token TEXT, password_reset_expires INTEGER, password_reset_used_at INTEGER, gocardless_mandate_id TEXT, gocardless_session_token TEXT, gocardless_redirect_flow_id TEXT);
INSERT INTO user VALUES(1,1757339904000,'Test User','test@example.com','$2b$10$bXH9/zJJ//GLeqdZIynx4uVQ39zmiSntW0fN7pIZUPOhJIBcWeUFm',NULL,NULL,NULL,'pending','active',NULL,0,NULL,NULL,NULL,'app_123','GREEN',1757340636873,NULL,'{"applicantId":"app_123","reviewStatus":"completed","reviewResult":{"reviewAnswer":"GREEN"},"externalUserId":1}',NULL,'signup',NULL,NULL,NULL,1757348624171,0,NULL,NULL,'9e6698676d7aa5b99299ae53fda4ab402df5070327d3aea6c950b25e40e756d8',1757347947499,NULL,NULL,NULL,NULL);
CREATE TABLE mail_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      subject TEXT,
      received_date TEXT,
      scan_file_url TEXT,
      file_size INTEGER,
      forwarded_physically INTEGER DEFAULT 0,
      notes TEXT,
      forwarded_date TEXT,
      forward_reason TEXT,
      sender_name TEXT,
      scanned INTEGER DEFAULT 0,
      deleted INTEGER DEFAULT 0,
      tag TEXT,
      is_billable_forward INTEGER DEFAULT 0,
      admin_note TEXT,
      deleted_by_admin INTEGER DEFAULT 0,
      action_log TEXT,
      scanned_at INTEGER,
      status TEXT DEFAULT 'received',
      requested_at INTEGER,
      physical_receipt_timestamp INTEGER,
      physical_dispatch_timestamp INTEGER,
      tracking_number TEXT,
      updated_at INTEGER, idempotency_key TEXT,
      FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
    );
INSERT INTO mail_item VALUES(1,1754089740742,1,NULL,NULL,'paid','https://example.com/invoice/123',NULL,NULL,NULL,NULL,NULL,0,0,NULL,0,NULL,0,NULL,NULL,'received',NULL,NULL,NULL,NULL,NULL,NULL);
CREATE TABLE payment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      gocardless_customer_id TEXT,
      subscription_id TEXT,
      status TEXT,
      invoice_url TEXT,
      mandate_id TEXT,
      amount INTEGER,
      currency TEXT DEFAULT 'GBP',
      description TEXT,
      payment_type TEXT DEFAULT 'subscription',
      updated_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
    );
CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      mail_item_id INTEGER,
      ip_address TEXT,
      user_agent TEXT
    );
INSERT INTO activity_log VALUES(1,1757339915660,1,'password_reset_requested','{"email":"test@example.com"}',NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(2,1757339921280,1,'password_reset_completed',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(3,1757340176221,1,'password_reset_requested','{"email":"test@example.com"}',NULL,'::ffff:127.0.0.1','curl/8.7.1');
INSERT INTO activity_log VALUES(4,1757340231272,1,'password_reset_completed',NULL,NULL,'::ffff:127.0.0.1','curl/8.7.1');
INSERT INTO activity_log VALUES(5,1757342471055,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(6,1757343626305,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(7,1757343658724,1,'password_reset_requested','{"email":"test@example.com"}',NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(8,1757344211392,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(9,1757344222440,1,'password_reset_requested','{"email":"test@example.com"}',NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(10,1757345134861,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(11,1757345632893,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(12,1757345648488,1,'password_reset_requested','{"email":"test@example.com"}',NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(13,1757345852426,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(14,1757345903808,1,'password_reset_requested','{"email":"test@example.com"}',NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(15,1757346109472,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(16,1757346147501,1,'password_reset_requested','{"email":"test@example.com"}',NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(17,1757346359862,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(18,1757346461959,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(19,1757346555465,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(20,1757346581343,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(21,1757346695216,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(22,1757347413559,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(23,1757347803751,1,'login',NULL,NULL,'::1','curl/8.7.1');
INSERT INTO activity_log VALUES(24,1757348624177,1,'login',NULL,NULL,'::1','curl/8.7.1');
CREATE TABLE admin_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      admin_user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT
    );
INSERT INTO admin_log VALUES(1,1756819432747,4,2,'admin_updated','{"status":"scanned"}',NULL,NULL);
INSERT INTO admin_log VALUES(2,1756821759604,5,2,'admin_updated','{"status":"scanned"}',NULL,NULL);
INSERT INTO admin_log VALUES(3,1756821788479,5,2,'physical_dispatch_logged','{"timestamp":1756821788479,"tracking_number":"RN123456789GB"}',NULL,NULL);
CREATE TABLE forwarding_request (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      "user" INTEGER NOT NULL,
      mail_item INTEGER NOT NULL,
      requested_at INTEGER,
      status TEXT DEFAULT 'pending',
      payment INTEGER,
      is_billable INTEGER DEFAULT 0,
      billed_at INTEGER,
      destination_name TEXT,
      destination_address TEXT,
      source TEXT,
      cancelled_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY("user") REFERENCES user(id) ON DELETE CASCADE,
      FOREIGN KEY(mail_item) REFERENCES mail_item(id) ON DELETE CASCADE
    );
CREATE TABLE mail_event (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      mail_item INTEGER NOT NULL,
      actor_user INTEGER,
      event_type TEXT NOT NULL,
      details TEXT,
      FOREIGN KEY(mail_item) REFERENCES mail_item(id) ON DELETE CASCADE
    );
/****** CORRUPTION ERROR *******/
CREATE TABLE webhook_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      raw_payload TEXT,
      received_at INTEGER NOT NULL,
      processed INTEGER DEFAULT 0,
      error_message TEXT
    );
CREATE TABLE password_reset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      ip_address TEXT,
      FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
    );
/****** CORRUPTION ERROR *******/
CREATE TABLE plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price INTEGER NOT NULL,
      currency TEXT DEFAULT 'GBP',
      interval TEXT DEFAULT 'monthly',
      features TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER,
      updated_at INTEGER
    );
INSERT INTO plans VALUES(1,'user','user',2,replace('CREATE TABLE user (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at INTEGER,\n  name TEXT,\n  email TEXT UNIQUE,\n  password TEXT,\n  first_name TEXT,\n  last_name TEXT,\n  forwarding_address TEXT,\n  kyc_status TEXT DEFAULT ''pending'',\n  plan_status TEXT DEFAULT ''active'',\n  one_drive_folder_url TEXT,\n  is_admin INTEGER DEFAULT 0,\n  kyc_updated_at INTEGER,\n  company_name TEXT,\n  companies_house_number TEXT,\n  sumsub_applicant_id TEXT,\n  sumsub_review_status TEXT,\n  sumsub_last_updated INTEGER,\n  sumsub_rejection_reason TEXT,\n  sumsub_webhook_payload TEXT,\n  plan_start_date INTEGER,\n  onboarding_step TEXT\n, login_attempts INTEGER DEFAULT 0, locked_until INTEGER, last_login_at INTEGER, password_reset_token TEXT, password_reset_expires INTEGER, password_reset_used_at INTEGER, gocardless_customer_id TEXT, gocardless_mandate_id TEXT, gocardless_session_token TEXT, gocardless_redirect_flow_id TEXT, email_pref_marketing INTEGER, email_pref_product INTEGER, email_pref_security INTEGER, email_unsubscribed_at INTEGER, email_bounced_at INTEGER)','\n',char(10)),'monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(2,'sqlite_autoindex_user_1','user',3,NULL,'monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(3,'sqlite_sequence','sqlite_sequence',4,'CREATE TABLE sqlite_sequence(name,seq)','monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(4,'mail_item','mail_item',5,replace('CREATE TABLE mail_item (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at INTEGER,\n  user_id INTEGER,\n  subject TEXT,\n  received_date TEXT,\n  scan_file_url TEXT,\n  file_size INTEGER,\n  forwarded_physically INTEGER DEFAULT 0,\n  notes TEXT,\n  forwarded_date TEXT,\n  forward_reason TEXT,\n  sender_name TEXT,\n  scanned INTEGER DEFAULT 0,\n  deleted INTEGER DEFAULT 0,\n  tag TEXT,\n  is_billable_forward INTEGER DEFAULT 0,\n  admin_note TEXT,\n  deleted_by_admin INTEGER DEFAULT 0,\n  action_log TEXT,\n  scanned_at INTEGER,\n  status TEXT DEFAULT ''received'',\n  requested_at INTEGER, physical_receipt_timestamp INTEGER, physical_dispatch_timestamp INTEGER, tracking_number TEXT,\n  FOREIGN KEY(user_id) REFERENCES user(id)\n)','\n',char(10)),'monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(5,'payment','payment',6,replace('CREATE TABLE payment (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at INTEGER,\n  user_id INTEGER,\n  gocardless_customer_id TEXT,\n  subscription_id TEXT,\n  status TEXT,\n  invoice_url TEXT,\n  mandate_id TEXT,\n  FOREIGN KEY(user_id) REFERENCES user(id)\n)','\n',char(10)),'monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(6,'activity_log','activity_log',7,replace('CREATE TABLE activity_log (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at INTEGER,\n  user_id INTEGER,\n  action TEXT,\n  details TEXT,\n  mail_item_id INTEGER\n, ip_address TEXT, user_agent TEXT)','\n',char(10)),'monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(7,'admin_log','admin_log',8,replace('CREATE TABLE admin_log (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at INTEGER,\n  admin_user_id INTEGER,\n  action_type TEXT,\n  target_type TEXT,\n  target_id INTEGER,\n  details TEXT\n)','\n',char(10)),'monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(8,'forwarding_request','forwarding_request',9,replace('CREATE TABLE forwarding_request (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at INTEGER,\n  user INTEGER,\n  mail_item INTEGER,\n  requested_at INTEGER,\n  status TEXT,\n  payment INTEGER,\n  is_billable INTEGER,\n  billed_at INTEGER,\n  destination_name TEXT,\n  destination_address TEXT,\n  source TEXT\n)','\n',char(10)),'monthly',NULL,1,NULL,NULL);
INSERT INTO plans VALUES(9,'mail_event','mail_event',10,replace('CREATE TABLE mail_event (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n  created_at INTEGER,\n  mail_item INTEGER,\n  actor_user INTEGER,\n  event_type TEXT,\n  details TEXT\n)','\n',char(10)),'monthly',NULL,1,NULL,NULL);
CREATE TABLE impersonation_token (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_user_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER DEFAULT 0,
      ip_address TEXT
    );
/****** CORRUPTION ERROR *******/
CREATE TABLE support_ticket (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER,
      closed_at INTEGER,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'open',
      FOREIGN KEY(user_id) REFERENCES user(id) ON DELETE CASCADE
    );
/****** CORRUPTION ERROR *******/
PRAGMA writable_schema=ON;
INSERT INTO sqlite_schema(type,name,tbl_name,rootpage,sql)VALUES('table','mail_item_fts','mail_item_fts',0,'CREATE VIRTUAL TABLE mail_item_fts USING fts5(
        subject, sender_name, notes, tag,
        content=''mail_item'', content_rowid=''id'',
        tokenize=''unicode61 remove_diacritics 2''
      )');
CREATE TABLE IF NOT EXISTS 'mail_item_fts_data'(id INTEGER PRIMARY KEY, block BLOB);
INSERT INTO mail_item_fts_data VALUES(1,X'');
INSERT INTO mail_item_fts_data VALUES(10,X'00000000000000');
CREATE TABLE IF NOT EXISTS 'mail_item_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'mail_item_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'mail_item_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID;
INSERT INTO mail_item_fts_config VALUES('version',4);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('user',1);
INSERT INTO sqlite_sequence VALUES('activity_log',24);
CREATE INDEX idx_user_email ON user(email);
CREATE INDEX idx_mail_item_user ON mail_item(user_id);
CREATE INDEX idx_mail_item_user_status ON mail_item(user_id, status);
CREATE INDEX idx_mail_item_created_at ON mail_item(created_at);
CREATE INDEX idx_mail_item_tag ON mail_item(tag);
CREATE INDEX idx_forwarding_request_user_status ON forwarding_request("user", status);
CREATE INDEX idx_forwarding_request_created_at ON forwarding_request(created_at);
CREATE INDEX idx_payment_user_created_at ON payment(user_id, created_at);
CREATE INDEX idx_support_ticket_user ON support_ticket(user_id);
CREATE TRIGGER mail_item_ai_fts AFTER INSERT ON mail_item BEGIN
        INSERT INTO mail_item_fts(rowid, subject, sender_name, notes, tag)
        VALUES (new.id, COALESCE(new.subject,''), COALESCE(new.sender_name,''), COALESCE(new.notes,''), COALESCE(new.tag,''));
      END;
CREATE TRIGGER mail_item_au_fts AFTER UPDATE ON mail_item BEGIN
        UPDATE mail_item_fts
        SET subject=COALESCE(new.subject,''), sender_name=COALESCE(new.sender_name,''), notes=COALESCE(new.notes,''), tag=COALESCE(new.tag,'')
        WHERE rowid=new.id;
        DELETE FROM mail_item_fts WHERE rowid=new.id AND (new.deleted = 1);
        INSERT INTO mail_item_fts(rowid, subject, sender_name, notes, tag)
          SELECT new.id, COALESCE(new.subject,''), COALESCE(new.sender_name,''), COALESCE(new.notes,''), COALESCE(new.tag,'')
          WHERE (new.deleted IS NULL OR new.deleted = 0)
          AND NOT EXISTS(SELECT 1 FROM mail_item_fts WHERE rowid=new.id);
      END;
CREATE TRIGGER mail_item_ad_fts AFTER DELETE ON mail_item BEGIN
        DELETE FROM mail_item_fts WHERE rowid=old.id;
      END;
CREATE UNIQUE INDEX idx_mail_item_idempotency_key ON mail_item(idempotency_key);
PRAGMA writable_schema=OFF;
ROLLBACK; -- due to errors
