/*
  # Add AI Insights to Clients Table

  1. New Columns
    - `ai_insights` (jsonb) - Stores comprehensive AI-generated insights about the client
    - `ai_insights_generated_at` (timestamptz) - Timestamp when insights were last generated

  2. Description
    This migration adds fields to store AI-generated behavioral analysis, sentiment analysis,
    market intelligence, and relationship insights for each client. The insights include:
    - Executive summary and client profile
    - Behavioral analysis (communication style, decision-making patterns)
    - Sentiment analysis (overall sentiment, relationship health)
    - Psychographic profile (priorities, pain points, motivations)
    - Market context (industry position, competitive pressure)
    - Opportunity analysis (upsell, cross-sell opportunities)
    - Actionable insights and recommendations
    - KPIs (engagement, collaboration, communication scores)
    - Predictive insights (retention probability, growth potential)

  3. Notes
    - JSONB format allows flexible storage of complex nested data
    - Indexed for fast querying
    - Nullable to allow gradual adoption
*/

-- Add AI insights fields to clients table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'ai_insights'
  ) THEN
    ALTER TABLE clients ADD COLUMN ai_insights jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clients' AND column_name = 'ai_insights_generated_at'
  ) THEN
    ALTER TABLE clients ADD COLUMN ai_insights_generated_at timestamptz;
  END IF;
END $$;

-- Create index for fast querying of insights
CREATE INDEX IF NOT EXISTS idx_clients_ai_insights_generated_at 
  ON clients(ai_insights_generated_at DESC);

-- Create GIN index for JSONB queries (allows querying within the insights JSON)
CREATE INDEX IF NOT EXISTS idx_clients_ai_insights_gin 
  ON clients USING GIN (ai_insights);
