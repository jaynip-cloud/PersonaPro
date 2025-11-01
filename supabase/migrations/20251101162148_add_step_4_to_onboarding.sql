/*
  # Add Step 4 to Onboarding State

  1. Changes
    - Add `step_4_completed` column to `org_onboarding_state` table
    - Add `step_4_data` column to store step 4 form data

  2. Notes
    - These fields support the 4-step onboarding wizard
    - Existing records will have NULL values (default)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'org_onboarding_state' AND column_name = 'step_4_completed'
  ) THEN
    ALTER TABLE org_onboarding_state ADD COLUMN step_4_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'org_onboarding_state' AND column_name = 'step_4_data'
  ) THEN
    ALTER TABLE org_onboarding_state ADD COLUMN step_4_data jsonb;
  END IF;
END $$;
