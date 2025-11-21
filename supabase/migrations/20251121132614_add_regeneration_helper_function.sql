/*
  # Add Helper Function for Embedding Regeneration

  1. New Functions
    - `get_meeting_transcripts_for_regeneration`: Returns all meeting transcripts with metadata for batch regeneration

  This function helps retrieve all transcripts that need embeddings regenerated.
*/

CREATE OR REPLACE FUNCTION get_meeting_transcripts_for_regeneration()
RETURNS TABLE (
  transcript_id uuid,
  user_id uuid,
  client_id uuid,
  title text,
  meeting_date timestamptz,
  client_company text,
  text_length int,
  existing_embedding_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.id as transcript_id,
    mt.user_id,
    mt.client_id,
    mt.title,
    mt.meeting_date,
    c.company as client_company,
    LENGTH(mt.transcript_text) as text_length,
    (SELECT COUNT(*) FROM document_embeddings de 
     WHERE de.metadata->>'transcript_id' = mt.id::text 
     AND de.source_type = 'meeting_transcript') as existing_embedding_count
  FROM meeting_transcripts mt
  JOIN clients c ON c.id = mt.client_id
  WHERE mt.user_id = auth.uid()
  ORDER BY mt.created_at;
END;
$$;
