-- Migration: Fix missing columns causing 500 errors
-- Run this on your PostgreSQL database

-- 1. Add email_unsubscribed_at column to user table (for email-prefs endpoint)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS email_unsubscribed_at TIMESTAMPTZ;

-- 2. Add state column to user table (for profile endpoint)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS state TEXT;

-- 3. Add billing_interval column to payment table (for payments endpoint)
ALTER TABLE payment ADD COLUMN IF NOT EXISTS billing_interval TEXT;

-- 4. Add item_id column to forwarding_request table (for forwarding endpoint)
ALTER TABLE forwarding_request ADD COLUMN IF NOT EXISTS item_id BIGINT REFERENCES mail_item(id);

-- 5. Create email_preferences table if it doesn't exist (for email-prefs endpoint)
CREATE TABLE IF NOT EXISTS email_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    email_unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id ON email_preferences(user_id);

-- 6. Create user_profile table if it doesn't exist (for profile endpoint)
CREATE TABLE IF NOT EXISTS user_profile (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    state TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);

-- 7. Create kyc_status table if it doesn't exist (for KYC endpoint)
CREATE TABLE IF NOT EXISTS kyc_status (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    sumsub_applicant_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_status_user_id ON kyc_status(user_id);

-- 8. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_email_unsubscribed_at ON "user"(email_unsubscribed_at);
CREATE INDEX IF NOT EXISTS idx_user_state ON "user"(state);
CREATE INDEX IF NOT EXISTS idx_payment_billing_interval ON payment(billing_interval);
CREATE INDEX IF NOT EXISTS idx_forwarding_request_item_id ON forwarding_request(item_id);

-- 9. Update the updated_at trigger for new tables
CREATE TRIGGER update_email_preferences_updated_at 
    BEFORE UPDATE ON email_preferences 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profile_updated_at 
    BEFORE UPDATE ON user_profile 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_status_updated_at 
    BEFORE UPDATE ON kyc_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
