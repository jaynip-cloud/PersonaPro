/*
  # Create Vector Search RPC Function

  1. New Functions
    - `match_documents` - Performs efficient vector similarity search
      - Uses cosine distance for similarity matching
      - Filters by user_id and optionally client_id
      - Returns matches above similarity threshold
      - Orders by similarity (highest first)
  
  2. Security
    - Function runs with caller's permissions (SECURITY DEFINER not used)
    - RLS policies automatically enforced on document_embeddings table
*/

-- Create function for vector similarity search
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_user_id uuid DEFAULT NULL,
  filter_client_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  client_id uuid,
  document_name text,
  document_url text,
  content_chunk text,
  chunk_index int,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_embeddings.id,
    document_embeddings.user_id,
    document_embeddings.client_id,
    document_embeddings.document_name,
    document_embeddings.document_url,
    document_embeddings.content_chunk,
    document_embeddings.chunk_index,
    document_embeddings.metadata,
    document_embeddings.created_at,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity
  FROM document_embeddings
  WHERE 
    (filter_user_id IS NULL OR document_embeddings.user_id = filter_user_id)
    AND (filter_client_id IS NULL OR document_embeddings.client_id = filter_client_id)
    AND 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;