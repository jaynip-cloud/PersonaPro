/*
  # Update project status values

  1. Changes
    - Update existing projects with old status values to new values
    - Update the status check constraint on projects table with new pre-sales workflow statuses
  
  2. Valid Status Values
    - 'opportunity_identified' (opp identified)
    - 'discussion'
    - 'quote'
    - 'win'
    - 'loss'
*/

-- First, update any existing projects with old status values to appropriate new values
UPDATE projects 
SET status = 'opportunity_identified' 
WHERE status = 'planned' OR status NOT IN ('opportunity_identified', 'discussion', 'quote', 'win', 'loss');

-- Drop the existing check constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add the updated check constraint with pre-sales status values
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('opportunity_identified', 'discussion', 'quote', 'win', 'loss'));
