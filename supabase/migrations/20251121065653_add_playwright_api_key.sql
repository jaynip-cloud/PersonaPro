/*
  # Add Playwright API Key

  1. Changes
    - Add `playwright_api_key` column to api_keys table

  2. Notes
    - Playwright is used for Python-based web scraping with full browser automation
    - This allows users to use their own Playwright service instance
*/

-- Add Playwright API key column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'playwright_api_key'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN playwright_api_key text;
  END IF;
END $$;
