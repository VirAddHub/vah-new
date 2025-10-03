-- Verification Script for Missing Schema Fixes (Migrations 107-110)
-- Run with: psql $DATABASE_URL -f verify-missing-schema-fixes.sql

\echo ''
\echo '=== 1. Checking download table exists ==='
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_name = 'download';

\echo ''
\echo '=== 2. Checking download table columns ==='
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'download'
ORDER BY ordinal_position;

\echo ''
\echo '=== 3. Checking GoCardless columns on user table ==='
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
  AND column_name LIKE '%gocardless%'
ORDER BY column_name;

\echo ''
\echo '=== 4. Checking kyc_verified_at column ==='
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'user'
  AND column_name = 'kyc_verified_at';

\echo ''
\echo '=== 5. Checking invoice table rename ==='
\echo 'Old tables (should be empty):'
SELECT table_name FROM information_schema.tables WHERE table_name IN ('invoice', 'invoice_seq');

\echo ''
\echo 'New tables (should show invoices and invoices_seq):'
SELECT table_name FROM information_schema.tables WHERE table_name IN ('invoices', 'invoices_seq');

\echo ''
\echo '=== 6. Checking indexes were created ==='
SELECT
    tablename,
    indexname
FROM pg_indexes
WHERE indexname LIKE '%download%'
   OR indexname LIKE '%gocardless%'
   OR indexname LIKE '%kyc_verified%'
   OR indexname LIKE '%invoices%'
ORDER BY tablename, indexname;

\echo ''
\echo '=== 7. Sample data check: KYC backfill ==='
SELECT
    id,
    email,
    kyc_status,
    kyc_verified_at,
    CASE
        WHEN kyc_verified_at IS NOT NULL THEN LENGTH(kyc_verified_at::text)
        ELSE 0
    END as timestamp_digits
FROM "user"
WHERE kyc_status = 'verified'
LIMIT 5;

\echo ''
\echo '=== Verification Complete ==='
\echo 'Check results above:'
\echo '  - download table should exist with 8 columns'
\echo '  - user table should have 3 gocardless columns'
\echo '  - user table should have kyc_verified_at column'
\echo '  - invoices and invoices_seq tables should exist (not invoice/invoice_seq)'
\echo '  - Multiple indexes should be created'
\echo '  - Verified users should have 13-digit kyc_verified_at timestamps'
