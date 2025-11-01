-- Migration: Create quiz_leads table for compliance check quiz submissions
-- Created: 2025-11-01

CREATE TABLE IF NOT EXISTS quiz_leads (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    name TEXT,
    email TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    answers JSONB,
    segment TEXT CHECK (segment IN ('high', 'mid', 'low')) NOT NULL DEFAULT 'low',
    source TEXT DEFAULT 'compliance-check',
    quiz_id TEXT,
    
    -- Indexes for common queries
    CONSTRAINT email_not_empty CHECK (email != '')
);

CREATE INDEX IF NOT EXISTS idx_quiz_leads_email ON quiz_leads(email);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_created_at ON quiz_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_segment ON quiz_leads(segment);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_score ON quiz_leads(score);

-- Add comment
COMMENT ON TABLE quiz_leads IS 'Stores compliance check quiz submissions with scores and segmentation';

