/*
  # Add 'opportunity_identified' status to projects

  1. Changes
    - Update the status check constraint on projects table to include 'opportunity_identified'
    - This allows projects created from opportunities to have the proper initial status
  
  2. Valid Status Values
    - 'opportunity_identified' (new)
    - 'planned'
    - 'in_progress'
    - 'on_hold'
    - 'completed'
    - 'cancelled'
*/

-- Drop the existing check constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Add the updated check constraint with 'opportunity_identified'
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('opportunity_identified', 'planned', 'in_progress', 'on_hold', 'completed', 'cancelled'));
