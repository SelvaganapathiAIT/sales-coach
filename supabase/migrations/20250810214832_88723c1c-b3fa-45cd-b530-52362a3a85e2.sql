-- STEP 1: Ensure enum value exists in its own transaction
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'app_role' AND n.nspname = 'public'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role' AND e.enumlabel = 'coach_admin'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'coach_admin';
    END IF;
  ELSE
    CREATE TYPE public.app_role AS ENUM ('admin', 'coach_admin', 'user');
  END IF;
END $$;