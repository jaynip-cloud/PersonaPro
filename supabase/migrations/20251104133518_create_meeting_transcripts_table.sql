/*
  # Create Meeting Transcripts Table

  1. New Tables
    - `meeting_transcripts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `client_id` (uuid, references clients)
      - `title` (text) - brief title or subject of meeting
      - `transcript` (text) - full meeting notes/transcript
      - `meeting_date` (date) - when the meeting occurred
      - `created_at` (timestamptz) - when transcript was saved
      - `updated_at` (timestamptz) - last update timestamp
  
  2. Indexes
    - Index on user_id and client_id for fast filtering
    - Index on meeting_date for chronological ordering
  
  3. Security
    - Enable RLS on meeting_transcripts
    - Users can only access their own transcripts
    - Policies for select, insert, update, delete
*/

-- Create meeting_transcripts table
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  transcript text NOT NULL,
  meeting_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_user_client 
  ON meeting_transcripts(user_id, client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_date 
  ON meeting_transcripts(meeting_date DESC);

-- Enable RLS
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own meeting transcripts"
  ON meeting_transcripts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own meeting transcripts"
  ON meeting_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own meeting transcripts"
  ON meeting_transcripts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own meeting transcripts"
  ON meeting_transcripts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meeting_transcripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meeting_transcripts_updated_at
  BEFORE UPDATE ON meeting_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_transcripts_updated_at();