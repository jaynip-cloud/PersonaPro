/*
  # Add LinkedIn URL to Contacts Table and Unique Constraint
  
  1. Adds linkedin_url column to the contacts table to store LinkedIn profile URLs
     fetched from Apollo.io API.
  2. Adds unique constraint on (client_id, email) to prevent duplicate contacts
     and enable upsert operations.
*/

-- Add linkedin_url column to contacts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE contacts ADD COLUMN linkedin_url text;
  END IF;
END $$;

-- Add unique constraint on (client_id, email) for upsert operations
-- First, remove any duplicate records (keep the most recent one)
DO $$
BEGIN
  -- Delete duplicates, keeping the one with the latest created_at
  DELETE FROM contacts c1
  WHERE EXISTS (
    SELECT 1 FROM contacts c2
    WHERE c2.client_id = c1.client_id
      AND c2.email = c1.email
      AND c2.id != c1.id
      AND c2.created_at > c1.created_at
  );
END $$;

-- Create unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contacts_client_id_email_unique'
  ) THEN
    ALTER TABLE contacts
    ADD CONSTRAINT contacts_client_id_email_unique
    UNIQUE (client_id, email);
  END IF;
END $$;

