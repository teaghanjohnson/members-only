-- Restore first_name if it was accidentally dropped by the old 004 migration.
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
