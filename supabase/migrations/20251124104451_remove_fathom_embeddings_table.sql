/*
  # Remove fathom_embeddings table

  This migration removes the fathom_embeddings table as embeddings are now stored in Pinecone instead of Supabase.

  1. Changes
    - Drop fathom_embeddings table
    - Drop related search functions that depend on this table
    - Keep fathom_recordings table as it stores metadata

  2. Notes
    - All Fathom transcript embeddings are now stored in Pinecone
    - Search is performed via Pinecone API instead of database queries
    - This is part of the unified vector storage strategy
*/

-- Drop search functions that depend on fathom_embeddings
DROP FUNCTION IF EXISTS search_fathom_transcripts(vector, uuid, float, int);

-- Drop the fathom_embeddings table
DROP TABLE IF EXISTS fathom_embeddings CASCADE;
