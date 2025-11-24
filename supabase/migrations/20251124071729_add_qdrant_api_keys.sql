/*
  # Add Qdrant API Keys to Settings

  ## Changes
  - Add qdrant_url and qdrant_api_key fields to api_keys table
  - These are required for vector storage and semantic search

  ## Usage
  Users need to configure:
  1. Qdrant Cloud URL (e.g., https://xyz.aws.cloud.qdrant.io:6333)
  2. Qdrant API key for authentication
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'qdrant_url'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN qdrant_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'api_keys' AND column_name = 'qdrant_api_key'
  ) THEN
    ALTER TABLE api_keys ADD COLUMN qdrant_api_key text;
  END IF;
END $$;
