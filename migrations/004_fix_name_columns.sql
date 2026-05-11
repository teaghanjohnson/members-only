-- Remove the nullable columns added by 003
ALTER TABLE users DROP COLUMN IF EXISTS first_name;
ALTER TABLE users DROP COLUMN IF EXISTS last_name;

-- Rename camelCase columns to snake_case to match the application queries
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firstname') THEN
    ALTER TABLE users RENAME COLUMN firstname TO first_name;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='lastname') THEN
    ALTER TABLE users RENAME COLUMN lastname TO last_name;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
    ALTER TABLE users ADD COLUMN last_name VARCHAR(100);
  END IF;
END $$;
