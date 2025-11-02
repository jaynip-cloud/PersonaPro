/*
  # Add Comprehensive Client Fields

  1. New Columns Added to `clients` Table
    - **Company Information**
      - `website` (text) - Company website URL
      - `company_size` (text) - Number of employees
      - `linkedin_url` (text) - LinkedIn profile URL
      - `twitter_url` (text) - Twitter handle
      - `instagram_url` (text) - Instagram profile URL
      - `facebook_url` (text) - Facebook page URL
      - `logo_url` (text) - Company logo URL
      - `city` (text) - City location
      - `country` (text) - Country location
      - `zip_code` (text) - Zip/postal code

    - **Contact Details**
      - `contact_name` (text) - Primary contact name
      - `primary_email` (text) - Primary email address
      - `alternate_email` (text) - Secondary email address
      - `primary_phone` (text) - Primary phone number
      - `alternate_phone` (text) - Secondary phone number
      - `job_title` (text) - Contact's job title/role
      - `preferred_contact_method` (text) - Preferred contact method

    - **Additional Information**
      - `company_overview` (text) - Detailed company overview
      - `budget_range` (text) - Budget range for projects
      - `documents` (jsonb) - Array of document metadata
      - `short_term_goals` (text) - Client's short-term goals
      - `long_term_goals` (text) - Client's long-term goals
      - `expectations` (text) - Client expectations
      - `satisfaction_score` (integer) - Client satisfaction rating (1-10)
      - `satisfaction_feedback` (text) - Satisfaction feedback notes
      - `description` (text) - General description/notes

  2. Notes
    - All new fields are nullable to allow gradual data entry
    - Documents stored as JSONB for flexibility
    - Maintains backward compatibility with existing data
*/

-- Add company information fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'website'
  ) THEN
    ALTER TABLE clients ADD COLUMN website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'company_size'
  ) THEN
    ALTER TABLE clients ADD COLUMN company_size text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'linkedin_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN linkedin_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'twitter_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN twitter_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'instagram_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN instagram_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'facebook_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN facebook_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE clients ADD COLUMN logo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'city'
  ) THEN
    ALTER TABLE clients ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'country'
  ) THEN
    ALTER TABLE clients ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE clients ADD COLUMN zip_code text;
  END IF;
END $$;

-- Add contact details fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE clients ADD COLUMN contact_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'primary_email'
  ) THEN
    ALTER TABLE clients ADD COLUMN primary_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'alternate_email'
  ) THEN
    ALTER TABLE clients ADD COLUMN alternate_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'primary_phone'
  ) THEN
    ALTER TABLE clients ADD COLUMN primary_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'alternate_phone'
  ) THEN
    ALTER TABLE clients ADD COLUMN alternate_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE clients ADD COLUMN job_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'preferred_contact_method'
  ) THEN
    ALTER TABLE clients ADD COLUMN preferred_contact_method text DEFAULT 'email';
  END IF;
END $$;

-- Add additional information fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'company_overview'
  ) THEN
    ALTER TABLE clients ADD COLUMN company_overview text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'budget_range'
  ) THEN
    ALTER TABLE clients ADD COLUMN budget_range text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'documents'
  ) THEN
    ALTER TABLE clients ADD COLUMN documents jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'short_term_goals'
  ) THEN
    ALTER TABLE clients ADD COLUMN short_term_goals text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'long_term_goals'
  ) THEN
    ALTER TABLE clients ADD COLUMN long_term_goals text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'expectations'
  ) THEN
    ALTER TABLE clients ADD COLUMN expectations text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'satisfaction_score'
  ) THEN
    ALTER TABLE clients ADD COLUMN satisfaction_score integer CHECK (satisfaction_score >= 1 AND satisfaction_score <= 10);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'satisfaction_feedback'
  ) THEN
    ALTER TABLE clients ADD COLUMN satisfaction_feedback text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'description'
  ) THEN
    ALTER TABLE clients ADD COLUMN description text;
  END IF;
END $$;

-- Create index on frequently searched fields
CREATE INDEX IF NOT EXISTS idx_clients_website ON clients(website);
CREATE INDEX IF NOT EXISTS idx_clients_city ON clients(city);
CREATE INDEX IF NOT EXISTS idx_clients_country ON clients(country);
CREATE INDEX IF NOT EXISTS idx_clients_primary_email ON clients(primary_email);
