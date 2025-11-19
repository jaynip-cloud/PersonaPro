/*
  # Add Firecrawl and Apollo API Keys

  1. Changes
    - Add `firecrawl_api_key` column to api_keys table
    - Add `apollo_api_key` column to api_keys table

  2. Notes
    - Firecrawl is used for web scraping and content extraction
    - Apollo is used for company and contact data enrichment
*/

-- Add Firecrawl and Apollo API key columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'firecrawl_api_key'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN firecrawl_api_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'apollo_api_key'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN apollo_api_key text;
  END IF;
END $$;
