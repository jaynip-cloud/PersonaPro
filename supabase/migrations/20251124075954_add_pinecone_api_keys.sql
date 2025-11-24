/*
  # Add Pinecone API Keys

  ## Changes
  1. Add Pinecone configuration fields to api_keys table
    - `pinecone_api_key` - API key for Pinecone
    - `pinecone_environment` - Pinecone environment (e.g., us-east-1-aws)
    - `pinecone_index_name` - Name of the Pinecone index to use
  
  ## Notes
  - Users can now choose between Qdrant or Pinecone for vector storage
  - All fields are optional to maintain backward compatibility
*/

-- Add Pinecone configuration columns
ALTER TABLE api_keys 
ADD COLUMN IF NOT EXISTS pinecone_api_key text,
ADD COLUMN IF NOT EXISTS pinecone_environment text,
ADD COLUMN IF NOT EXISTS pinecone_index_name text;
