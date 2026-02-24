-- 123_invoices_seq_unique_year.sql
-- Restore UNIQUE on invoices_seq(year) so INSERT ... ON CONFLICT (year) works.
-- Migration 110 replaced the unique index with a non-unique one by mistake.

DROP INDEX IF EXISTS idx_invoices_seq_year;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_seq_year ON invoices_seq(year);
