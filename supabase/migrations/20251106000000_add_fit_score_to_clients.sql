/*
  # Add Fit Score to Clients Table

  1. New Column
    - `fit_score` (integer) - Client fit score (0-100)
    - Default value: 90 (static data as requested)
  
  2. Notes
    - Sets default value to 90 for all existing and new clients
    - Allows NULL for backward compatibility but defaults to 90
*/

-- Add fit_score column to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'fit_score'
  ) THEN
    ALTER TABLE clients
    ADD COLUMN fit_score integer DEFAULT 90;
    
    -- Update all existing clients to have fit_score of 90
    UPDATE clients
    SET fit_score = 90
    WHERE fit_score IS NULL;
  END IF;
END $$;

