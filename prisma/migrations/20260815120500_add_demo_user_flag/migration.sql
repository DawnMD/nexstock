-- Read-only accounts for the public demo. Defaults to false, so every existing
-- account keeps full access.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;
