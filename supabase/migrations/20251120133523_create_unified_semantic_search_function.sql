/*
  # Create Unified Semantic Search Function

  1. New Functions
    - `match_all_content` - Searches both document_embeddings and fathom_embeddings tables
      - Combines results from both document uploads and Fathom meeting transcripts
      - Returns unified results with source type indicators
      - Uses cosine distance for similarity matching
      - Filters by user_id and optionally client_id
      - Returns matches above similarity threshold
      - Orders by similarity (highest first)
  
  2. Security
    - Function runs with caller's permissions
    - RLS policies automatically enforced on both tables
*/

-- Create unified search function that includes Fathom embeddings
CREATE OR REPLACE FUNCTION match_all_content(
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
  source_type text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH combined_results AS (
    -- Query document_embeddings
    SELECT
      document_embeddings.id,
      document_embeddings.user_id,
      document_embeddings.client_id,
      document_embeddings.document_name,
      document_embeddings.document_url,
      document_embeddings.content_chunk,
      document_embeddings.chunk_index,
      document_embeddings.metadata,
      document_embeddings.source_type,
      document_embeddings.created_at,
      1 - (document_embeddings.embedding <=> query_embedding) AS similarity
    FROM document_embeddings
    WHERE 
      (filter_user_id IS NULL OR document_embeddings.user_id = filter_user_id)
      AND (filter_client_id IS NULL OR document_embeddings.client_id = filter_client_id)
      AND 1 - (document_embeddings.embedding <=> query_embedding) > match_threshold
    
    UNION ALL
    
    -- Query fathom_embeddings
    SELECT
      fathom_embeddings.id,
      fathom_embeddings.user_id,
      fathom_embeddings.client_id,
      fathom_recordings.title AS document_name,
      fathom_recordings.playback_url AS document_url,
      fathom_embeddings.chunk_text AS content_chunk,
      fathom_embeddings.chunk_index,
      jsonb_build_object(
        'recording_id', fathom_embeddings.recording_id,
        'speaker_name', fathom_embeddings.speaker_name,
        'speaker_email', fathom_embeddings.speaker_email,
        'start_timestamp', fathom_embeddings.start_timestamp,
        'end_timestamp', fathom_embeddings.end_timestamp,
        'meeting_date', fathom_recordings.start_time
      ) AS metadata,
      COALESCE(fathom_embeddings.source_type, 'fathom_transcript') AS source_type,
      fathom_embeddings.created_at,
      1 - (fathom_embeddings.embedding <=> query_embedding) AS similarity
    FROM fathom_embeddings
    INNER JOIN fathom_recordings ON fathom_embeddings.recording_id = fathom_recordings.id
    WHERE 
      (filter_user_id IS NULL OR fathom_embeddings.user_id = filter_user_id)
      AND (filter_client_id IS NULL OR fathom_embeddings.client_id = filter_client_id)
      AND 1 - (fathom_embeddings.embedding <=> query_embedding) > match_threshold
  )
  SELECT 
    combined_results.id,
    combined_results.user_id,
    combined_results.client_id,
    combined_results.document_name,
    combined_results.document_url,
    combined_results.content_chunk,
    combined_results.chunk_index,
    combined_results.metadata,
    combined_results.source_type,
    combined_results.created_at,
    combined_results.similarity
  FROM combined_results
  ORDER BY combined_results.similarity DESC
  LIMIT match_count;
END;
$$;
