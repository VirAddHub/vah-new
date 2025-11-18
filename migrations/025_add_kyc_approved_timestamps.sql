-- Migration: Add KYC approval and CH reminder timestamps
-- Date: 2025-01-18
-- Purpose: Track when KYC was approved and when CH reminders were last sent

-- Add kyc_approved_at timestamp (when KYC status became 'approved')
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS kyc_approved_at TIMESTAMPTZ;

-- Add ch_reminder_last_sent_at timestamp (to avoid spamming users)
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS ch_reminder_last_sent_at TIMESTAMPTZ;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_kyc_approved_at ON "user"(kyc_approved_at);
CREATE INDEX IF NOT EXISTS idx_user_ch_reminder_sent_at ON "user"(ch_reminder_last_sent_at);

