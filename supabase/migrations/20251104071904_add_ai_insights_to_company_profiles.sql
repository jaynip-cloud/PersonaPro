/*
  # Add AI Insights to Company Profiles

  1. Changes
    - Add `ai_insights` column to store AI-generated analysis
    - Add `ai_insights_generated_at` timestamp to track when insights were last generated
    - Add index for faster queries

  2. Security
    - No RLS changes needed (inherits from table)
*/

-- Add AI insights column to company_profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'ai_insights'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN ai_insights jsonb DEFAULT NULL;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_profiles' AND column_name = 'ai_insights_generated_at'
  ) THEN
    ALTER TABLE company_profiles ADD COLUMN ai_insights_generated_at timestamptz DEFAULT NULL;
  END IF;
END $$;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_company_profiles_ai_insights 
ON company_profiles(user_id, ai_insights_generated_at);