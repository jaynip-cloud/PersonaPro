/*
  # Client Intelligence Platform Schema

  ## Overview
  This migration creates a comprehensive database schema for a client intelligence and relationship management platform.
  The schema supports client data, persona analysis, documents, communications, opportunities, and AI-powered insights.

  ## New Tables

  ### Core Tables
  1. `clients`
     - Primary client information including contact details, status, and metadata
     - Tracks company information, location, industry classification
     - Stores persona scores and customer success manager assignments

  2. `contacts`
     - Individual contacts associated with clients
     - Tracks decision makers, influence levels, and contact information
     - Links to client records for relationship mapping

  3. `personas`
     - AI-generated persona profiles for clients
     - Communication styles, decision-making patterns, priorities
     - Response patterns and sentiment analysis

  4. `persona_metrics`
     - Detailed metrics from persona analysis
     - Cooperation levels, risk assessment, engagement patterns
     - Communication style and negotiation tone analysis

  ### Data Sources & Intelligence
  5. `documents`
     - Client documents (proposals, contracts, reports, emails)
     - Processing status and AI-generated summaries
     - Tags and insights extraction

  6. `call_records`
     - Phone call logs with transcriptions
     - Sentiment analysis and action items
     - Key points extraction

  7. `meeting_transcripts`
     - Meeting recordings and transcriptions
     - Speaker identification and action items
     - Sentiment and engagement tracking

  8. `social_profiles`
     - Social media profile information
     - Activity tracking and follower metrics
     - Multi-platform support

  9. `website_summaries`
     - Scraped website data and analysis
     - Service offerings and tech stack
     - Market positioning insights

  ### Financial & Opportunities
  10. `financial_data`
      - Revenue tracking (MRR, total revenue)
      - Active deals and pipeline metrics
      - Latest deal information

  11. `opportunities`
      - Sales opportunities and deals
      - Stage tracking and probability scoring
      - Value and timeline management

  ### Intelligence & Analysis
  12. `intelligence_queries`
      - AI assistant query history
      - Quick vs deep analysis modes
      - Key findings and recommended actions
      - Token usage and cost tracking

  13. `recommendations`
      - AI-generated recommendations and insights
      - Priority and type classification
      - Action tracking and status

  14. `evidence_snippets`
      - Supporting evidence for AI conclusions
      - Source attribution and sentiment
      - Contribution scoring

  ### Company & Matching
  15. `company_profile`
      - Your company's profile and capabilities
      - Services offered and case studies
      - Team information

  16. `company_services`
      - Service catalog with descriptions
      - Budget ranges and proof points
      - Tags for matching

  17. `case_studies`
      - Portfolio of work and results
      - Industry-specific examples
      - Metrics and outcomes

  18. `generated_pitches`
      - AI-generated sales pitches
      - Personalized value propositions
      - A/B variants for testing

  ### Data Management
  19. `connectors`
      - Integration status tracking
      - OAuth credentials and sync status
      - Data type and scope management

  20. `ingestion_events`
      - Audit log of data imports
      - Connector activity tracking
      - Item-level ingestion history

  ## Security
  - RLS enabled on all tables
  - Authenticated users can only access their own organization's data
  - Policies enforce data isolation and access control
*/

-- Create custom types
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'prospect');
CREATE TYPE client_tier AS ENUM ('platinum', 'gold', 'silver', 'bronze');
CREATE TYPE document_type AS ENUM ('proposal', 'contract', 'report', 'note', 'email', 'other');
CREATE TYPE document_status AS ENUM ('processing', 'completed', 'failed');
CREATE TYPE call_type AS ENUM ('inbound', 'outbound');
CREATE TYPE sentiment_type AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE cooperation_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE confidence_level AS ENUM ('high', 'medium', 'low');
CREATE TYPE opportunity_stage AS ENUM ('lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost');
CREATE TYPE recommendation_type AS ENUM ('action', 'insight', 'warning', 'opportunity');
CREATE TYPE recommendation_status AS ENUM ('new', 'viewed', 'actioned', 'dismissed');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE query_mode AS ENUM ('quick', 'deep');
CREATE TYPE pitch_tone AS ENUM ('formal', 'casual');
CREATE TYPE pitch_length AS ENUM ('short', 'long');
CREATE TYPE connector_status AS ENUM ('not_connected', 'connecting', 'connected', 'error');
CREATE TYPE social_platform AS ENUM ('linkedin', 'twitter', 'facebook', 'instagram');
CREATE TYPE ingestion_item_type AS ENUM ('document', 'profile', 'contact', 'transcript', 'website', 'interaction');
CREATE TYPE communication_frequency AS ENUM ('daily', 'weekly', 'monthly', 'sporadic');

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar text,
  role text,
  industry text,
  status client_status DEFAULT 'prospect',
  tier client_tier,
  location text,
  founded text,
  last_contact timestamptz,
  next_follow_up timestamptz,
  persona_score integer DEFAULT 0,
  health_score integer,
  csm text,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  role text NOT NULL,
  department text,
  is_primary boolean DEFAULT false,
  is_decision_maker boolean DEFAULT false,
  influence_level text,
  source text,
  last_contact timestamptz,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Personas table
CREATE TABLE IF NOT EXISTS personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  communication_style text,
  decision_making_style text,
  priorities text[] DEFAULT '{}',
  pain_points text[] DEFAULT '{}',
  interests text[] DEFAULT '{}',
  preferred_channels text[] DEFAULT '{}',
  avg_response_time text,
  preferred_time_of_day text,
  best_day_of_week text,
  sentiment_overall sentiment_type,
  sentiment_score numeric(3,2),
  confidence numeric(3,2),
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Persona metrics table
CREATE TABLE IF NOT EXISTS persona_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  sentiment numeric(3,2),
  cooperation cooperation_level,
  risk_level risk_level,
  communication_style_value text,
  communication_style_confidence confidence_level,
  response_speed_avg_days numeric(4,2),
  response_speed_confidence confidence_level,
  negotiation_tone_value text,
  negotiation_tone_confidence confidence_level,
  engagement_pattern_value text,
  engagement_pattern_confidence confidence_level,
  top_project_types text[] DEFAULT '{}',
  sentiment_trend numeric[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  type document_type DEFAULT 'other',
  size bigint,
  url text,
  summary text,
  insights text[] DEFAULT '{}',
  tags text[] DEFAULT '{}',
  status document_status DEFAULT 'processing',
  source text,
  uploaded_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Call records table
CREATE TABLE IF NOT EXISTS call_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  call_date timestamptz NOT NULL,
  duration integer,
  type call_type,
  summary text,
  key_points text[] DEFAULT '{}',
  sentiment sentiment_type,
  action_items text[] DEFAULT '{}',
  transcript_url text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Meeting transcripts table
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  meeting_date timestamptz NOT NULL,
  duration integer,
  transcript_text text,
  sentiment sentiment_type,
  action_items text[] DEFAULT '{}',
  speakers jsonb DEFAULT '[]',
  source text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Social profiles table
CREATE TABLE IF NOT EXISTS social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  platform social_platform NOT NULL,
  url text NOT NULL,
  profile_name text,
  title text,
  headline text,
  recent_activity text,
  follower_count integer,
  source text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Website summaries table
CREATE TABLE IF NOT EXISTS website_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  domain text NOT NULL,
  headline text,
  services text[] DEFAULT '{}',
  blog_urls text[] DEFAULT '{}',
  tech_stack text[] DEFAULT '{}',
  market_position text,
  scraped_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Financial data table
CREATE TABLE IF NOT EXISTS financial_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  mrr numeric(12,2) DEFAULT 0,
  total_revenue numeric(12,2) DEFAULT 0,
  active_deals integer DEFAULT 0,
  latest_deal_name text,
  latest_deal_value numeric(12,2),
  latest_deal_stage text,
  latest_deal_close_date timestamptz,
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id),
  UNIQUE(client_id)
);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  value numeric(12,2),
  stage opportunity_stage DEFAULT 'lead',
  probability integer DEFAULT 0,
  expected_close_date timestamptz,
  source text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Intelligence queries table
CREATE TABLE IF NOT EXISTS intelligence_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  query text NOT NULL,
  mode query_mode DEFAULT 'quick',
  response text,
  key_findings text[] DEFAULT '{}',
  recommended_actions jsonb DEFAULT '[]',
  tokens_used integer DEFAULT 0,
  cost numeric(8,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  type recommendation_type,
  priority priority_level DEFAULT 'medium',
  title text NOT NULL,
  description text,
  suggested_actions text[] DEFAULT '{}',
  status recommendation_status DEFAULT 'new',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Evidence snippets table
CREATE TABLE IF NOT EXISTS evidence_snippets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  text text NOT NULL,
  source text NOT NULL,
  source_type text,
  contribution numeric(3,2),
  sentiment sentiment_type,
  evidence_date timestamptz,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Company profile table
CREATE TABLE IF NOT EXISTS company_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  value_proposition text,
  team jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Company services table
CREATE TABLE IF NOT EXISTS company_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  budget_min numeric(12,2),
  budget_max numeric(12,2),
  proof_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Case studies table
CREATE TABLE IF NOT EXISTS case_studies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_name text,
  industry text,
  thumbnail text,
  services text[] DEFAULT '{}',
  results text[] DEFAULT '{}',
  metrics jsonb DEFAULT '[]',
  description text,
  url text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Generated pitches table
CREATE TABLE IF NOT EXISTS generated_pitches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_company text NOT NULL,
  services text[] DEFAULT '{}',
  tone pitch_tone DEFAULT 'formal',
  length pitch_length DEFAULT 'short',
  elevator_pitch text,
  value_points text[] DEFAULT '{}',
  next_actions text[] DEFAULT '{}',
  confidence numeric(3,2),
  evidence_tags text[] DEFAULT '{}',
  variant text,
  company_description text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Connectors table
CREATE TABLE IF NOT EXISTS connectors (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  status connector_status DEFAULT 'not_connected',
  last_synced timestamptz,
  items_count integer DEFAULT 0,
  is_priority boolean DEFAULT false,
  data_types text[] DEFAULT '{}',
  scopes text[] DEFAULT '{}',
  field_mapping jsonb DEFAULT '{}',
  error_message text,
  credentials jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Ingestion events table
CREATE TABLE IF NOT EXISTS ingestion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id text REFERENCES connectors(id),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  description text,
  item_type ingestion_item_type,
  item_id text,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE persona_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE connectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for contacts table
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contacts"
  ON contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts"
  ON contacts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts"
  ON contacts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for personas table
CREATE POLICY "Users can view own personas"
  ON personas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own personas"
  ON personas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own personas"
  ON personas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own personas"
  ON personas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for persona_metrics table
CREATE POLICY "Users can view own persona_metrics"
  ON persona_metrics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persona_metrics"
  ON persona_metrics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own persona_metrics"
  ON persona_metrics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own persona_metrics"
  ON persona_metrics FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for documents table
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for call_records table
CREATE POLICY "Users can view own call_records"
  ON call_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call_records"
  ON call_records FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own call_records"
  ON call_records FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own call_records"
  ON call_records FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for meeting_transcripts table
CREATE POLICY "Users can view own meeting_transcripts"
  ON meeting_transcripts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meeting_transcripts"
  ON meeting_transcripts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meeting_transcripts"
  ON meeting_transcripts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meeting_transcripts"
  ON meeting_transcripts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for social_profiles table
CREATE POLICY "Users can view own social_profiles"
  ON social_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social_profiles"
  ON social_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social_profiles"
  ON social_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own social_profiles"
  ON social_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for website_summaries table
CREATE POLICY "Users can view own website_summaries"
  ON website_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own website_summaries"
  ON website_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own website_summaries"
  ON website_summaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own website_summaries"
  ON website_summaries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for financial_data table
CREATE POLICY "Users can view own financial_data"
  ON financial_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial_data"
  ON financial_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial_data"
  ON financial_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial_data"
  ON financial_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for opportunities table
CREATE POLICY "Users can view own opportunities"
  ON opportunities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own opportunities"
  ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own opportunities"
  ON opportunities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own opportunities"
  ON opportunities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for intelligence_queries table
CREATE POLICY "Users can view own intelligence_queries"
  ON intelligence_queries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own intelligence_queries"
  ON intelligence_queries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own intelligence_queries"
  ON intelligence_queries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own intelligence_queries"
  ON intelligence_queries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for recommendations table
CREATE POLICY "Users can view own recommendations"
  ON recommendations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations"
  ON recommendations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
  ON recommendations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own recommendations"
  ON recommendations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for evidence_snippets table
CREATE POLICY "Users can view own evidence_snippets"
  ON evidence_snippets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own evidence_snippets"
  ON evidence_snippets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own evidence_snippets"
  ON evidence_snippets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own evidence_snippets"
  ON evidence_snippets FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for company_profile table
CREATE POLICY "Users can view own company_profile"
  ON company_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company_profile"
  ON company_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company_profile"
  ON company_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own company_profile"
  ON company_profile FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for company_services table
CREATE POLICY "Users can view own company_services"
  ON company_services FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company_services"
  ON company_services FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company_services"
  ON company_services FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own company_services"
  ON company_services FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for case_studies table
CREATE POLICY "Users can view own case_studies"
  ON case_studies FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own case_studies"
  ON case_studies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own case_studies"
  ON case_studies FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own case_studies"
  ON case_studies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for generated_pitches table
CREATE POLICY "Users can view own generated_pitches"
  ON generated_pitches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated_pitches"
  ON generated_pitches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated_pitches"
  ON generated_pitches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated_pitches"
  ON generated_pitches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for connectors table
CREATE POLICY "Users can view own connectors"
  ON connectors FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connectors"
  ON connectors FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connectors"
  ON connectors FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own connectors"
  ON connectors FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ingestion_events table
CREATE POLICY "Users can view own ingestion_events"
  ON ingestion_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ingestion_events"
  ON ingestion_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ingestion_events"
  ON ingestion_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ingestion_events"
  ON ingestion_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_contacts_client_id ON contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_personas_client_id ON personas(client_id);
CREATE INDEX IF NOT EXISTS idx_persona_metrics_client_id ON persona_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_call_records_client_id ON call_records(client_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_client_id ON meeting_transcripts(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_queries_client_id ON intelligence_queries(client_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_client_id ON recommendations(client_id);
CREATE INDEX IF NOT EXISTS idx_evidence_snippets_client_id ON evidence_snippets(client_id);
