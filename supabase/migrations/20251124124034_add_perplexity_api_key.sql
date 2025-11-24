/*
  # Add Perplexity API Key to Settings

  1. Changes
    - Add `perplexity_api_key` column to `api_keys` table for internet search capability
    - This enables the Intelligence Agent to search the web when context is insufficient
  
  2. Notes
    - Used by `answer-client-query` edge function for web searches
    - Optional field (can be null)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'perplexity_api_key'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN perplexity_api_key TEXT;
  END IF;
END $$;
