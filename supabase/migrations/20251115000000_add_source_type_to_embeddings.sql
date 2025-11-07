/*
  # Add Source Type to Document Embeddings

  1. Alterations
    - Add `source_type` column to `document_embeddings` table
    - Default value: 'document' (for backward compatibility)
    - New values: 'document' | 'meeting_transcript'
    - Add index on source_type for filtering

  2. Notes
    - Existing records will default to 'document'
    - Allows same table to store embeddings for both documents and meeting transcripts
*/

-- Add source_type column
ALTER TABLE document_embeddings
ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'document' CHECK (source_type IN ('document', 'meeting_transcript'));

-- Add index for source_type filtering
CREATE INDEX IF NOT EXISTS idx_document_embeddings_source_type 
  ON document_embeddings(source_type);

-- Add index for meeting transcript ID (stored in metadata)
CREATE INDEX IF NOT EXISTS idx_document_embeddings_metadata_transcript_id 
  ON document_embeddings((metadata->>'transcript_id'))
  WHERE source_type = 'meeting_transcript';

-- Update existing records to have source_type = 'document'
UPDATE document_embeddings
SET source_type = 'document'
WHERE source_type IS NULL;

