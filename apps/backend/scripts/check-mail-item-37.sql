-- Check mail item 37 to see why destruction is failing
SELECT 
    m.id,
    m.user_id,
    m.received_at_ms,
    m.received_date,
    m.created_at,
    m.deleted,
    m.status,
    m.physical_destruction_date,
    u.email AS user_email,
    u.is_admin AS user_is_admin,
    -- Calculate receipt date
    CASE 
        WHEN m.received_at_ms IS NOT NULL THEN
            to_timestamp(m.received_at_ms / 1000)::date
        WHEN m.received_date IS NOT NULL THEN
            m.received_date::date
        WHEN m.created_at IS NOT NULL THEN
            to_timestamp(m.created_at / 1000)::date
        ELSE NULL::date
    END AS calculated_receipt_date,
    -- Calculate eligibility date
    CASE 
        WHEN m.received_at_ms IS NOT NULL THEN
            (to_timestamp(m.received_at_ms / 1000) + INTERVAL '30 days')::date
        WHEN m.received_date IS NOT NULL THEN
            (m.received_date::date + INTERVAL '30 days')::date
        WHEN m.created_at IS NOT NULL THEN
            (to_timestamp(m.created_at / 1000) + INTERVAL '30 days')::date
        ELSE NULL::date
    END AS eligibility_date,
    -- Check if eligible now
    CASE 
        WHEN m.received_at_ms IS NOT NULL THEN
            (to_timestamp(m.received_at_ms / 1000) + INTERVAL '30 days') <= NOW()
        WHEN m.received_date IS NOT NULL THEN
            (m.received_date::date + INTERVAL '30 days') <= NOW()
        WHEN m.created_at IS NOT NULL THEN
            (to_timestamp(m.created_at / 1000) + INTERVAL '30 days') <= NOW()
        ELSE false
    END AS is_eligible,
    -- Check if already destroyed
    (SELECT COUNT(*) FROM destruction_log WHERE mail_item_id = m.id) AS destruction_log_count
FROM mail_item m
JOIN "user" u ON u.id = m.user_id
WHERE m.id = 37;

