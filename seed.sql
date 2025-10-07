-- Create a safe test mail item for user 4 (adjust user_id/subject/tag)
INSERT INTO mail_item (id, user_id, subject, tag, created_at)
VALUES (99999, 4, 'Test Seed Mail', 'GENERAL', now())
ON CONFLICT (id) DO NOTHING;
