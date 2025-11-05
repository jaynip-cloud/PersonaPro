/*
  # Add AI Generated Tracking to Projects

  1. Changes
    - Add `is_ai_generated` column to projects table
    - Tracks if a project was created from an AI-generated opportunity
    - Defaults to false for manually created projects
  
  2. Security
    - No RLS changes needed (inherits from existing policies)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'is_ai_generated'
  ) THEN
    ALTER TABLE projects ADD COLUMN is_ai_generated boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_projects_ai_generated 
  ON projects(is_ai_generated, client_id);