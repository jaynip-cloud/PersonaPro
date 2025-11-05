/*
  # Create Saved Pitches Table

  1. New Tables
    - `saved_pitches`
      - `id` (uuid, primary key) - Unique identifier for the pitch
      - `project_id` (uuid, foreign key) - Reference to projects table
      - `client_id` (uuid, foreign key) - Reference to clients table
      - `title` (text) - Title of the pitch
      - `content` (text) - Full pitch content
      - `variant` (text) - Variant identifier (A or B)
      - `services` (text array) - Services included in the pitch
      - `tone` (text) - Tone of the pitch (formal/casual)
      - `length` (text) - Length of the pitch (short/long)
      - `created_at` (timestamptz) - When the pitch was created
      - `updated_at` (timestamptz) - When the pitch was last updated
      - `created_by` (uuid, foreign key) - User who created the pitch

  2. Security
    - Enable RLS on `saved_pitches` table
    - Add policies for authenticated users to:
      - View pitches for their clients
      - Create new pitches for their clients
      - Update pitches they created
      - Delete pitches they created

  3. Indexes
    - Index on project_id for fast lookup by project
    - Index on client_id for fast lookup by client
    - Index on created_by for fast lookup by user
*/

-- Create saved_pitches table
CREATE TABLE IF NOT EXISTS saved_pitches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  variant text CHECK (variant IN ('A', 'B')),
  services text[] DEFAULT '{}',
  tone text CHECK (tone IN ('formal', 'casual')),
  length text CHECK (length IN ('short', 'long')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE saved_pitches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pitches
CREATE POLICY "Users can view own pitches"
  ON saved_pitches
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Policy: Users can create pitches
CREATE POLICY "Users can create pitches"
  ON saved_pitches
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update pitches they created
CREATE POLICY "Users can update own pitches"
  ON saved_pitches
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can delete pitches they created
CREATE POLICY "Users can delete own pitches"
  ON saved_pitches
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saved_pitches_project 
  ON saved_pitches(project_id);

CREATE INDEX IF NOT EXISTS idx_saved_pitches_client 
  ON saved_pitches(client_id);

CREATE INDEX IF NOT EXISTS idx_saved_pitches_created_by 
  ON saved_pitches(created_by);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_pitches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_pitches_updated_at ON saved_pitches;

CREATE TRIGGER saved_pitches_updated_at
  BEFORE UPDATE ON saved_pitches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_pitches_updated_at();