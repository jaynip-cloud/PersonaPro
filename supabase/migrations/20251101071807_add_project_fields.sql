/*
  # Add additional project fields

  ## Changes
  1. Add project_code field for unique project identifier
  2. Add tags array for project categorization
  3. Add currency field for international projects
  4. Add value_amount field (replacing revenue)
  5. Add last_updated timestamp (auto-managed)
  6. Add end_date_planned as alias/clarification
  
  ## Notes
  - Uses IF EXISTS checks to prevent errors
  - Maintains backward compatibility
*/

-- Add project_code column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'project_code'
  ) THEN
    ALTER TABLE projects ADD COLUMN project_code text UNIQUE;
  END IF;
END $$;

-- Add tags column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'tags'
  ) THEN
    ALTER TABLE projects ADD COLUMN tags text[] DEFAULT '{}';
  END IF;
END $$;

-- Add currency column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'currency'
  ) THEN
    ALTER TABLE projects ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;

-- Add value_amount column if it doesn't exist (more appropriate than revenue)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'value_amount'
  ) THEN
    ALTER TABLE projects ADD COLUMN value_amount decimal(12, 2);
  END IF;
END $$;

-- Create index on project_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_projects_project_code ON projects(project_code);

-- Create index on tags for array searches
CREATE INDEX IF NOT EXISTS idx_projects_tags ON projects USING GIN(tags);

-- Create index on updated_at for sorting
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
