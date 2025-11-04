/*
  # Add updated_at column to meeting_transcripts

  1. Changes
    - Add `updated_at` column to `meeting_transcripts` table
    - Set default value to `now()`
    - Backfill existing rows with their created_at value
  
  2. Purpose
    - Fix the trigger error that was preventing updates
    - Track when transcripts are last modified
*/

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN updated_at timestamptz DEFAULT now();
    
    -- Backfill existing rows with created_at value
    UPDATE meeting_transcripts SET updated_at = created_at WHERE updated_at IS NULL;
  END IF;
END $$;