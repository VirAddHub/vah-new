-- idempotent: safe to re-run
ALTER TABLE IF EXISTS plans
  ADD COLUMN IF NOT EXISTS amount_pence integer NOT NULL DEFAULT 0;

-- Update webhook_log table to match expected schema
-- First, add new columns if they don't exist
ALTER TABLE IF EXISTS webhook_log 
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now();

-- Rename existing columns if they exist
DO $$ 
BEGIN
  -- Rename source to provider if source exists and provider doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'source') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'provider') THEN
    ALTER TABLE webhook_log RENAME COLUMN source TO provider;
  END IF;
  
  -- Rename payload_json to payload if payload_json exists and payload doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'payload_json') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'payload') THEN
    ALTER TABLE webhook_log RENAME COLUMN payload_json TO payload;
  END IF;
  
  -- Rename created_at to received_at if created_at exists and received_at doesn't
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'created_at') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'received_at') THEN
    ALTER TABLE webhook_log RENAME COLUMN created_at TO received_at;
  END IF;
END $$;

-- Update the payload column type to jsonb if it's still text
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'payload' AND data_type = 'text') THEN
    ALTER TABLE webhook_log ALTER COLUMN payload TYPE jsonb USING payload::jsonb;
  END IF;
END $$;

-- Update the received_at column type to timestamptz if it's still bigint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_log' AND column_name = 'received_at' AND data_type = 'bigint') THEN
    ALTER TABLE webhook_log ALTER COLUMN received_at TYPE timestamptz USING to_timestamp(received_at/1000);
  END IF;
END $$;

-- Make provider NOT NULL if it's currently nullable
ALTER TABLE webhook_log ALTER COLUMN provider SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_log_provider ON webhook_log(provider);
CREATE INDEX IF NOT EXISTS idx_webhook_log_received_at ON webhook_log(received_at);
