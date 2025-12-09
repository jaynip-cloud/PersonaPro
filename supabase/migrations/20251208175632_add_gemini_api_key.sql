/*
  # Add Gemini API Key to Settings

  1. Changes
    - Add `gemini_api_key` column to `api_keys` table for Google Gemini AI integration
    - This enables client information enrichment using Gemini 2.5 Flash model
  
  2. Notes
    - Used by `enrich-client-gemini` edge function for client data extraction
    - Optional field (can be null)
    - Get API key from Google AI Studio: https://aistudio.google.com/
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'gemini_api_key'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN gemini_api_key TEXT;
  END IF;
END $$;

