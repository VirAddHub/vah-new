-- Migration: Add Companies House verification fields
-- Date: 2025-01-18
-- Purpose: Add fields to track Companies House identity verification status and proof upload

-- Add Companies House verification fields to user table
ALTER TABLE "user" 
ADD COLUMN IF NOT EXISTS companies_house_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS ch_verification_proof_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ch_verified ON "user"(companies_house_verified);

