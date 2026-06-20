-- Convert is_admin boolean to a role enum column.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'guest'
  CHECK (role IN ('guest', 'member', 'admin'));

-- Carry forward any existing admins and drop the old boolean if it exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    UPDATE users SET role = 'admin' WHERE is_admin = true;
    ALTER TABLE users DROP COLUMN is_admin;
  END IF;
END $$;

-- Add created_at to users if missing.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
