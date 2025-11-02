/*
  # Add Knowledge Base Fields to Company Profiles

  1. Changes
    - Add fields for all knowledge base modules:
      - `value_proposition` (text) - Company value proposition
      - `founded` (text) - Year founded
      - `location` (text) - Headquarters location
      - `size` (text) - Company size/employee count
      - `mission` (text) - Mission statement
      - `vision` (text) - Vision statement
      - `address` (text) - Physical address
      - `youtube_url` (text) - YouTube profile
      - `leadership` (jsonb) - Array of leadership team members
      - `case_studies` (jsonb) - Array of case studies
      - `blogs` (jsonb) - Array of blog articles
      - `press_news` (jsonb) - Array of press releases
      - `careers` (jsonb) - Careers information object
      - `technology` (jsonb) - Technology stack and partners object

  2. Notes
    - Uses JSONB for complex data structures
    - All fields are nullable to allow gradual completion
    - Existing data is preserved
*/

-- Add new fields to company_profiles table
DO $$
BEGIN
  -- Company information fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'value_proposition'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN value_proposition text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'founded'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN founded text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'location'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'size'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN size text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'mission'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN mission text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'vision'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN vision text;
  END IF;

  -- Contact fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN address text;
  END IF;

  -- Social media fields
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'youtube_url'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN youtube_url text;
  END IF;

  -- Complex data fields (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'leadership'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN leadership jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'case_studies'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN case_studies jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'blogs'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN blogs jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'press_news'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN press_news jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'careers'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN careers jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'company_profiles' AND column_name = 'technology'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN technology jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
