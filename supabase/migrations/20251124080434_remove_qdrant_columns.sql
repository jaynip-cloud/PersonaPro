/*
  # Remove Qdrant Columns from API Keys

  ## Changes
  1. Drop Qdrant configuration fields from api_keys table
    - Drop `qdrant_url` column
    - Drop `qdrant_api_key` column
  
  ## Notes
  - System will now exclusively use Pinecone for vector storage
  - Existing Qdrant data will remain in external Qdrant instances but won't be accessed
*/

-- Remove Qdrant configuration columns
ALTER TABLE api_keys 
DROP COLUMN IF EXISTS qdrant_url,
DROP COLUMN IF EXISTS qdrant_api_key;
