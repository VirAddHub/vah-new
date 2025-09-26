-- 010_address_tables.sql
CREATE TABLE IF NOT EXISTS public.location (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  line1      TEXT NOT NULL,
  line2      TEXT,
  city       TEXT NOT NULL,
  postcode   TEXT NOT NULL,
  country    TEXT NOT NULL DEFAULT 'United Kingdom',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.address_slot (
  id             BIGSERIAL PRIMARY KEY,
  location_id    BIGINT NOT NULL REFERENCES public.location(id) ON DELETE RESTRICT,
  mailbox_no     TEXT NOT NULL,       -- e.g. "Suite 021"
  status         TEXT NOT NULL DEFAULT 'available', -- available|reserved|assigned
  assigned_to    BIGINT,              -- users.id (nullable until assigned)
  assigned_at    TIMESTAMPTZ,
  reserved_until TIMESTAMPTZ,         -- optional for future reservations
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast pickup of free slots
CREATE INDEX IF NOT EXISTS address_slot_available_idx
  ON public.address_slot (status, location_id, id);

-- One active (assigned) slot per user
CREATE UNIQUE INDEX IF NOT EXISTS user_active_address_unique
  ON public.address_slot (assigned_to)
  WHERE status = 'assigned';
