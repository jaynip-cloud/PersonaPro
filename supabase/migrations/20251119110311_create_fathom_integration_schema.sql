/*
  # Create Fathom Integration Schema

  1. New Tables
    - `fathom_recordings`
      - Stores raw Fathom recording data with metadata
      - Includes transcript, summary, highlights, participants
      - Filtered by team (customer success, executive, sales)
      - Filtered by meeting type (client engagement, sales initial call, client call)

    - `fathom_embeddings`
      - Vector embeddings for transcript chunks
      - Enables semantic search across meeting content
      - Links to recordings and clients

  2. Updated Tables
    - `api_keys` - Add fathom_api_key column
    - `meeting_transcripts` - Add fathom fields for backward compatibility

  3. Security
    - Enable RLS on all tables
    - Users can only access their own recordings
    - Policies for select, insert, update, delete

  4. Indexes
    - Performance indexes for filtering and searching
    - Vector similarity search index
*/

-- ============================================
-- Update api_keys table for Fathom API key
-- ============================================

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS fathom_api_key text;

-- ============================================
-- Create fathom_recordings table
-- ============================================

CREATE TABLE IF NOT EXISTS fathom_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,

  -- Fathom metadata
  recording_id text UNIQUE NOT NULL,
  folder_id text,
  title text NOT NULL,
  meeting_url text,
  playback_url text,

  -- Timing
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration_minutes integer,

  -- Platform & participants
  meeting_platform text, -- 'zoom', 'google_meet', 'teams', etc.
  host_name text,
  host_email text,
  participants jsonb DEFAULT '[]'::jsonb, -- [{ name, email, role }]

  -- Filters (as specified)
  team_name text, -- 'customer_success', 'executive', 'sales'
  meeting_type text, -- 'client_engagement', 'sales_initial_call', 'client_call'

  -- Content
  transcript text NOT NULL, -- Full speaker-tagged transcript
  transcript_language text DEFAULT 'en',
  summary text, -- Auto-generated summary
  summary_sections jsonb DEFAULT '[]'::jsonb, -- Structured summary sections

  -- Highlights & key moments
  highlights jsonb DEFAULT '[]'::jsonb, -- [{ text, timestamp, flagged_by, speaker }]
  action_items jsonb DEFAULT '[]'::jsonb, -- [{ text, assignee, completed, due_date }]
  decisions jsonb DEFAULT '[]'::jsonb, -- [{ text, timestamp, participants }]
  topics jsonb DEFAULT '[]'::jsonb, -- [{ name, confidence }]

  -- Sentiment & tone (if Fathom provides)
  sentiment_score float, -- 0-1 scale
  tone_tags jsonb DEFAULT '[]'::jsonb, -- ['positive', 'concerned', 'enthusiastic']

  -- Raw data for audit
  raw_response jsonb NOT NULL, -- Full Fathom API response

  -- Processing status
  embeddings_generated boolean DEFAULT false,
  insights_processed boolean DEFAULT false,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fathom_recordings_user_client
  ON fathom_recordings(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_fathom_recordings_recording_id
  ON fathom_recordings(recording_id);
CREATE INDEX IF NOT EXISTS idx_fathom_recordings_folder_id
  ON fathom_recordings(folder_id);
CREATE INDEX IF NOT EXISTS idx_fathom_recordings_start_time
  ON fathom_recordings(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_fathom_recordings_team_name
  ON fathom_recordings(team_name);
CREATE INDEX IF NOT EXISTS idx_fathom_recordings_meeting_type
  ON fathom_recordings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_fathom_recordings_embeddings
  ON fathom_recordings(embeddings_generated) WHERE embeddings_generated = false;

-- Enable RLS
ALTER TABLE fathom_recordings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own fathom recordings"
  ON fathom_recordings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own fathom recordings"
  ON fathom_recordings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own fathom recordings"
  ON fathom_recordings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own fathom recordings"
  ON fathom_recordings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_fathom_recordings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fathom_recordings_updated_at
  BEFORE UPDATE ON fathom_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_fathom_recordings_updated_at();

-- ============================================
-- Create fathom_embeddings table
-- ============================================

CREATE TABLE IF NOT EXISTS fathom_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  recording_id uuid REFERENCES fathom_recordings(id) ON DELETE CASCADE NOT NULL,

  -- Chunk metadata
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  chunk_tokens integer,

  -- Temporal context
  start_timestamp integer, -- seconds from meeting start
  end_timestamp integer,

  -- Speaker context
  speaker_name text,
  speaker_email text,

  -- Vector embedding
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small

  -- Source metadata
  source_type text DEFAULT 'fathom_transcript',

  -- Timestamps
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fathom_embeddings_user_client
  ON fathom_embeddings(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_fathom_embeddings_recording
  ON fathom_embeddings(recording_id);
CREATE INDEX IF NOT EXISTS idx_fathom_embeddings_chunk
  ON fathom_embeddings(recording_id, chunk_index);

-- Create vector similarity index using HNSW (Hierarchical Navigable Small World)
CREATE INDEX IF NOT EXISTS idx_fathom_embeddings_vector
  ON fathom_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Enable RLS
ALTER TABLE fathom_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own fathom embeddings"
  ON fathom_embeddings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own fathom embeddings"
  ON fathom_embeddings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own fathom embeddings"
  ON fathom_embeddings FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- Add Fathom fields to meeting_transcripts (backward compatibility)
-- ============================================

DO $$
BEGIN
  -- Add columns one by one with IF NOT EXISTS check
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'fathom_recording_id'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN fathom_recording_id uuid REFERENCES fathom_recordings(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'fathom_meeting_id'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN fathom_meeting_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'fathom_share_url'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN fathom_share_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'summary'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'participants'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN participants jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'sentiment_analysis'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN sentiment_analysis jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN duration_minutes integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'meeting_transcripts' AND column_name = 'recording_url'
  ) THEN
    ALTER TABLE meeting_transcripts ADD COLUMN recording_url text;
  END IF;
END $$;

-- Create indexes for meeting_transcripts Fathom fields
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_fathom_recording
  ON meeting_transcripts(fathom_recording_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_fathom_meeting_id
  ON meeting_transcripts(fathom_meeting_id);

-- ============================================
-- Create helper function for semantic search
-- ============================================

CREATE OR REPLACE FUNCTION search_fathom_transcripts(
  query_embedding vector(1536),
  match_client_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  recording_id uuid,
  chunk_text text,
  speaker_name text,
  start_timestamp integer,
  similarity float,
  recording_title text,
  meeting_date timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fe.recording_id,
    fe.chunk_text,
    fe.speaker_name,
    fe.start_timestamp,
    1 - (fe.embedding <=> query_embedding) as similarity,
    fr.title as recording_title,
    fr.start_time as meeting_date
  FROM fathom_embeddings fe
  JOIN fathom_recordings fr ON fe.recording_id = fr.id
  WHERE
    fe.client_id = match_client_id
    AND 1 - (fe.embedding <=> query_embedding) > match_threshold
  ORDER BY fe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================
-- Create helper function to get recent meeting context
-- ============================================

CREATE OR REPLACE FUNCTION get_recent_fathom_context(
  match_client_id uuid,
  days_back integer DEFAULT 90,
  limit_count integer DEFAULT 5
)
RETURNS TABLE (
  recording_id text,
  title text,
  start_time timestamptz,
  summary text,
  key_topics jsonb,
  action_items jsonb,
  sentiment_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fr.recording_id,
    fr.title,
    fr.start_time,
    fr.summary,
    fr.topics as key_topics,
    fr.action_items,
    fr.sentiment_score
  FROM fathom_recordings fr
  WHERE
    fr.client_id = match_client_id
    AND fr.start_time > now() - (days_back || ' days')::interval
    AND fr.embeddings_generated = true
  ORDER BY fr.start_time DESC
  LIMIT limit_count;
END;
$$;
