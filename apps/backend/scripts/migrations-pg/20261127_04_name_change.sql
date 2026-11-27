-- Legal name changes made by staff (marriage, deed poll, correcting a mistake). Customers cannot
-- change their own name. Each change keeps the previous name, the reason and the document checked,
-- and cannot be altered or deleted afterwards (same rule as identity_check).
CREATE TABLE IF NOT EXISTS user_name_change (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id),
    previous_first_name TEXT,
    previous_last_name TEXT,
    new_first_name TEXT NOT NULL,
    new_last_name TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('marriage', 'divorce', 'deed_poll', 'correction', 'other')),
    evidence TEXT NOT NULL,
    reference TEXT NOT NULL,
    note TEXT,
    admin_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_name_change_user_idx ON user_name_change (user_id);
DROP TRIGGER IF EXISTS user_name_change_immutable ON user_name_change;
CREATE TRIGGER user_name_change_immutable BEFORE UPDATE OR DELETE ON user_name_change
    FOR EACH ROW EXECUTE FUNCTION company_check_no_change();
