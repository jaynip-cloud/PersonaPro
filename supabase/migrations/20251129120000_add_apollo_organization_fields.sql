/*
  # Add Apollo Organization Fields to Clients Table
  
  1. New Columns Added to `clients` Table
    - `state` (text) - State/Province
    - `apollo_data` (jsonb) - Store complex nested Apollo data (technologies, funding, metrics, etc.)
    - `annual_revenue` (numeric) - Annual revenue number
    - `total_funding` (numeric) - Total funding amount
    - `latest_funding_stage` (text) - Latest funding stage (e.g., "Series D")
    - `street_address` (text) - Street address
  
  2. Notes
    - All new fields are nullable to allow gradual data entry
    - `apollo_data` stores complex nested data as JSONB for flexibility
    - Maintains backward compatibility with existing data
*/

-- Add state column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'state'
  ) THEN
    ALTER TABLE clients ADD COLUMN state text;
  END IF;
END $$;

-- Add apollo_data JSONB column for complex data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'apollo_data'
  ) THEN
    ALTER TABLE clients ADD COLUMN apollo_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add annual_revenue column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'annual_revenue'
  ) THEN
    ALTER TABLE clients ADD COLUMN annual_revenue numeric;
  END IF;
END $$;

-- Add total_funding column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'total_funding'
  ) THEN
    ALTER TABLE clients ADD COLUMN total_funding numeric;
  END IF;
END $$;

-- Add latest_funding_stage column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'latest_funding_stage'
  ) THEN
    ALTER TABLE clients ADD COLUMN latest_funding_stage text;
  END IF;
END $$;

-- Add street_address column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE clients ADD COLUMN street_address text;
  END IF;
END $$;

