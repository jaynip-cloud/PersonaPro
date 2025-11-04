/*
  # Add Meeting Notes to Clients Table

  1. Changes
    - Add `meeting_notes` column to clients table
      - `meeting_notes` (text) - stores meeting notes and discussion points
  
  2. Notes
    - Column is nullable to support existing clients
    - No default value needed
*/

-- Add meeting_notes column to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'meeting_notes'
  ) THEN
    ALTER TABLE clients ADD COLUMN meeting_notes text;
  END IF;
END $$;