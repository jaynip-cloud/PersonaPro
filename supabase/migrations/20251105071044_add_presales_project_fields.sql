/*
  # Add Pre-Sales Project Fields

  1. Changes to `projects` table
    - Add `budget` (numeric) - Project budget amount
    - Add `timeline` (text) - Estimated project duration
    - Add `due_date` (date) - Due date for current status phase
    - Add `description` (text) - Project description from opportunity
    - Add `opportunity_id` (uuid) - Reference to source opportunity
    - Update status to include pre-sales stages
  
  2. Purpose
    - Support pre-sales project workflow
    - Track opportunity-to-project conversion
    - Enable budget and timeline planning
    - Add due dates for each project phase
*/

-- Add new fields to projects table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'budget'
  ) THEN
    ALTER TABLE projects ADD COLUMN budget numeric(15, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'timeline'
  ) THEN
    ALTER TABLE projects ADD COLUMN timeline text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE projects ADD COLUMN due_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'description'
  ) THEN
    ALTER TABLE projects ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'opportunity_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for opportunity lookup
CREATE INDEX IF NOT EXISTS idx_projects_opportunity 
  ON projects(opportunity_id) 
  WHERE opportunity_id IS NOT NULL;

-- Add comment to describe valid status values for pre-sales workflow
COMMENT ON COLUMN projects.status IS 'Valid values: opportunity_identified, discussion, quote, win, loss, planned, in_progress, on_hold, completed, cancelled';