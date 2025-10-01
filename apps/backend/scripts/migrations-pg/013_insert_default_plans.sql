-- Migration: Insert default pricing plans (monthly and yearly)

-- Insert monthly plan
INSERT INTO plans (
    name,
    slug,
    description,
    price_pence,
    interval,
    currency,
    features_json,
    active,
    vat_inclusive,
    trial_days,
    sort,
    created_at,
    updated_at
) VALUES (
    'Virtual Mailbox - Monthly',
    'virtual-mailbox-monthly',
    'London Business Address + Same-Day Digital Mail',
    999,  -- £9.99
    'month',
    'GBP',
    '["Use as Registered Office & Director''s Service Address (Companies House + HMRC)", "Professional London business address for banking, invoices & websites", "Unlimited digital mail scanning — uploaded same day it arrives", "Secure online dashboard to read, download, archive or request actions", "HMRC & Companies House mail: digital scan + physical forwarding at no charge", "Cancel anytime. No setup fees or long-term contracts", "UK support — Mon-Fri, 9AM–6PM GMT"]',
    true,
    true,
    0,
    1,
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Insert yearly plan
INSERT INTO plans (
    name,
    slug,
    description,
    price_pence,
    interval,
    currency,
    features_json,
    active,
    vat_inclusive,
    trial_days,
    sort,
    created_at,
    updated_at
) VALUES (
    'Virtual Mailbox - Annual',
    'virtual-mailbox-annual',
    'London Business Address + Same-Day Digital Mail',
    8999,  -- £89.99
    'year',
    'GBP',
    '["Use as Registered Office & Director''s Service Address (Companies House + HMRC)", "Professional London business address for banking, invoices & websites", "Unlimited digital mail scanning — uploaded same day it arrives", "Secure online dashboard to read, download, archive or request actions", "HMRC & Companies House mail: digital scan + physical forwarding at no charge", "Cancel anytime. No setup fees or long-term contracts", "UK support — Mon-Fri, 9AM–6PM GMT", "Save 25% — equivalent to £7.50/month"]',
    true,
    true,
    0,
    2,
    NOW(),
    NOW()
) ON CONFLICT (slug) DO NOTHING;
