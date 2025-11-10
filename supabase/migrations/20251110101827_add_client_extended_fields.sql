/*
  # Add Extended Fields to Clients Table

  1. New Fields
    - `services` (jsonb) - Array of services the client is interested in or uses
    - `technologies` (jsonb) - Array of technologies/tech stack the client uses
    - `blogs` (jsonb) - Array of blog articles/resources related to the client
    - `annual_revenue` (text) - Client's annual revenue
    - `employee_count` (text) - Number of employees
    - `pain_points` (jsonb) - Array of pain points identified
    - `competitors` (jsonb) - Array of competitor information
    - `decision_makers` (jsonb) - Array of key decision makers
    - `projects` (jsonb) - Array of projects or initiatives

  2. Notes
    - All jsonb fields default to empty array for consistency
    - These fields enhance the client intelligence capabilities
*/

-- Add services field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS services jsonb DEFAULT '[]'::jsonb;

-- Add technologies field (if not exists - it might already exist as array)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'technologies'
  ) THEN
    ALTER TABLE clients ADD COLUMN technologies jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Add blogs field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS blogs jsonb DEFAULT '[]'::jsonb;

-- Add annual_revenue field (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE clients ADD COLUMN annual_revenue text;
  END IF;
END $$;

-- Add employee_count field (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'employee_count'
  ) THEN
    ALTER TABLE clients ADD COLUMN employee_count text;
  END IF;
END $$;

-- Add pain_points field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS pain_points jsonb DEFAULT '[]'::jsonb;

-- Add competitors field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS competitors jsonb DEFAULT '[]'::jsonb;

-- Add decision_makers field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS decision_makers jsonb DEFAULT '[]'::jsonb;

-- Add projects field
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS projects jsonb DEFAULT '[]'::jsonb;
