-- Remove latest test forwarding request on that mail item
DELETE FROM forwarding_request
WHERE mail_item_id = 99999
  AND created_at >= now() - interval '1 hour';
