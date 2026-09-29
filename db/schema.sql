-- Nightshift schema.
--
-- You do not need to run this. On the first request the app creates both the
-- auth tables (see ensureAuthSchema in src/lib/auth-schema.ts) and the tasks
-- table (see ensureSchema in src/lib/db.ts). This file exists so the schema is
-- reviewable and so you can set it up by hand if you prefer.
--
-- Run it in the Neon SQL editor, or:  psql "$DATABASE_URL" -f db/schema.sql

-- ---------------------------------------------------------------------------
-- Auth tables (managed and created by Better Auth)
--
-- Better Auth owns these. Do not hand-edit them — change the auth config in
-- src/lib/auth.ts and let the migration run. The full definitions are:
--   user(id, name, email, email_verified, image, created_at, updated_at)
--   session(id, user_id, token, expires_at, ip_address, user_agent, ...)
--   account(id, account_id, provider_id, user_id, ...)
--   verification(id, identifier, value, expires_at, ...)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Application tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tasks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 280),
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'in_review', 'done')),
  -- Holds a user.id. Intentionally not a foreign key: the column is nullable
  -- and predates auth, and keeping it unconstrained means the tasks table can
  -- be created independently of the auth tables.
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by text;

-- The board reads every task ordered by status then recency.
CREATE INDEX IF NOT EXISTS tasks_status_created_idx
  ON tasks (status, created_at DESC);
