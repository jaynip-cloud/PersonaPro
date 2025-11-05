/*
  # Add Growth Opportunities Enhancement Fields

  1. Changes to `opportunities` table
    - Add `is_ai_generated` (boolean) - Tracks if opportunity was created by AI
    - Add `converted_to_project_id` (uuid) - Links to project if converted
    - Add `ai_analysis` (jsonb) - Stores AI analysis data used to identify the opportunity
    - Add `updated_at` (timestamptz) - Track last update time
  
  2. Purpose
    - Support AI-generated growth opportunities
    - Track conversion from opportunity to project
    - Store AI reasoning and analysis
*/

-- Add new fields to opportunities table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'is_ai_generated'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN is_ai_generated boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'converted_to_project_id'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN converted_to_project_id uuid REFERENCES projects(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'ai_analysis'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN ai_analysis jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'opportunities' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create index for converted projects lookup
CREATE INDEX IF NOT EXISTS idx_opportunities_converted_project 
  ON opportunities(converted_to_project_id) 
  WHERE converted_to_project_id IS NOT NULL;

-- Create index for AI-generated opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_ai_generated 
  ON opportunities(is_ai_generated, client_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_opportunities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_opportunities_updated_at ON opportunities;
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_opportunities_updated_at();