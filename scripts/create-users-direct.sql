-- Enable pgcrypto extension for bcrypt functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create admin user with bcrypt hashing
INSERT INTO "user" (email, password, first_name, last_name, role, is_admin, status, created_at, updated_at)
VALUES (
  'ops@virtualaddresshub.co.uk',
  crypt('CHANGE_ME_AFTER_FIRST_LOGIN', gen_salt('bf', 10)),  -- bcrypt with cost 10
  'Site', 
  'Admin',
  'admin', 
  TRUE,
  'active',
  EXTRACT(EPOCH FROM NOW())*1000::BIGINT,
  EXTRACT(EPOCH FROM NOW())*1000::BIGINT
)
ON CONFLICT (email) DO UPDATE
SET 
  role = EXCLUDED.role, 
  is_admin = EXCLUDED.is_admin, 
  status = EXCLUDED.status, 
  updated_at = EXCLUDED.updated_at;

-- Create worker user with bcrypt hashing  
INSERT INTO "user" (email, password, first_name, last_name, role, is_admin, status, created_at, updated_at)
VALUES (
  'worker@yourdomain.com',
  crypt('CHANGE_ME_AFTER_FIRST_LOGIN', gen_salt('bf', 10)),  -- bcrypt with cost 10
  'Ops', 
  'Worker',
  'worker', 
  FALSE,
  'active',
  EXTRACT(EPOCH FROM NOW())*1000::BIGINT,
  EXTRACT(EPOCH FROM NOW())*1000::BIGINT
)
ON CONFLICT (email) DO UPDATE
SET 
  role = EXCLUDED.role, 
  is_admin = EXCLUDED.is_admin, 
  status = EXCLUDED.status, 
  updated_at = EXCLUDED.updated_at;

-- Verify the users were created
SELECT email, first_name, last_name, role, is_admin, status, created_at 
FROM "user" 
WHERE email IN ('ops@virtualaddresshub.co.uk', 'worker@yourdomain.com')
ORDER BY email;
