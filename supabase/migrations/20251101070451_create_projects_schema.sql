/*
  # Create Projects Module Schema

  ## Overview
  Complete projects management system with intelligence layer for tracking client projects,
  risks, opportunities, and AI-driven insights.

  ## New Tables
  
  ### 1. `projects`
  Core project information and tracking
  - `id` (uuid, primary key)
  - `client_id` (uuid, foreign key to clients)
  - `name` (text) - Project title
  - `project_type` (text) - Web Dev, Automation, Branding, etc.
  - `status` (text) - Planned, In Progress, On Hold, Completed, Cancelled
  - `summary` (text) - Project description
  - `scope_summary` (text) - Agreed scope
  - `start_date` (date)
  - `estimated_end_date` (date)
  - `actual_end_date` (date)
  - `progress_percentage` (integer) - 0-100
  - `health_score` (integer) - 0-100
  - `sentiment_trend` (text) - up, stable, down
  - `revenue` (decimal)
  - `project_manager` (text)
  - `team_members` (text array)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `project_deliverables`
  Scope deliverables and milestones
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `name` (text)
  - `description` (text)
  - `type` (text) - deliverable or milestone
  - `due_date` (date)
  - `status` (text) - pending, in_progress, completed
  - `completed_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 3. `project_risks`
  Risk tracking and management
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `description` (text)
  - `severity` (text) - low, medium, high
  - `impact_area` (text) - scope, timeline, cost, relationship
  - `owner` (text)
  - `status` (text) - open, monitoring, resolved
  - `mitigation_plan` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `project_opportunities`
  Upsell and expansion opportunities
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `client_id` (uuid, foreign key)
  - `summary` (text)
  - `potential_value` (decimal)
  - `owner` (text)
  - `next_step` (text)
  - `status` (text) - exploration, pitching, closed, rejected
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `project_communications`
  Meeting notes and communication history
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `type` (text) - meeting, email, call, note
  - `date` (timestamptz)
  - `summary` (text)
  - `sentiment_score` (integer) - 0-100
  - `participants` (text array)
  - `follow_ups` (text array)
  - `created_at` (timestamptz)

  ### 6. `project_documents`
  Files and document tracking
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `name` (text)
  - `type` (text) - proposal, sow, contract, meeting_notes, asset
  - `file_url` (text)
  - `file_size` (bigint)
  - `uploaded_by` (text)
  - `created_at` (timestamptz)

  ### 7. `project_insights`
  AI-generated insights and analysis
  - `id` (uuid, primary key)
  - `project_id` (uuid, foreign key)
  - `insight_type` (text) - health, sentiment, risk, opportunity, satisfaction
  - `content` (jsonb)
  - `confidence_score` (integer) - 0-100
  - `generated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their projects

  ## Notes
  - All tables use proper foreign key constraints
  - Indexes added for common query patterns
  - Default values set for better UX
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  project_type text DEFAULT 'general',
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  summary text,
  scope_summary text,
  start_date date,
  estimated_end_date date,
  actual_end_date date,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  health_score integer DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  sentiment_trend text DEFAULT 'stable' CHECK (sentiment_trend IN ('up', 'stable', 'down')),
  revenue decimal(12, 2),
  project_manager text,
  team_members text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_deliverables table
CREATE TABLE IF NOT EXISTS project_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  type text DEFAULT 'deliverable' CHECK (type IN ('deliverable', 'milestone')),
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create project_risks table
CREATE TABLE IF NOT EXISTS project_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  impact_area text CHECK (impact_area IN ('scope', 'timeline', 'cost', 'relationship')),
  owner text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'monitoring', 'resolved')),
  mitigation_plan text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_opportunities table
CREATE TABLE IF NOT EXISTS project_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  summary text NOT NULL,
  potential_value decimal(12, 2),
  owner text,
  next_step text,
  status text DEFAULT 'exploration' CHECK (status IN ('exploration', 'pitching', 'closed', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create project_communications table
CREATE TABLE IF NOT EXISTS project_communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  type text DEFAULT 'note' CHECK (type IN ('meeting', 'email', 'call', 'note')),
  date timestamptz DEFAULT now(),
  summary text NOT NULL,
  sentiment_score integer CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
  participants text[],
  follow_ups text[],
  created_at timestamptz DEFAULT now()
);

-- Create project_documents table
CREATE TABLE IF NOT EXISTS project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text CHECK (type IN ('proposal', 'sow', 'contract', 'meeting_notes', 'asset')),
  file_url text,
  file_size bigint,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

-- Create project_insights table
CREATE TABLE IF NOT EXISTS project_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  insight_type text NOT NULL CHECK (insight_type IN ('health', 'sentiment', 'risk', 'opportunity', 'satisfaction')),
  content jsonb NOT NULL,
  confidence_score integer CHECK (confidence_score >= 0 AND confidence_score <= 100),
  generated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_health_score ON projects(health_score);
CREATE INDEX IF NOT EXISTS idx_project_deliverables_project_id ON project_deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_severity ON project_risks(severity);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_project_id ON project_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_project_opportunities_client_id ON project_opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_project_communications_project_id ON project_communications(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_insights_project_id ON project_insights(project_id);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_insights ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for projects
CREATE POLICY "Users can view all projects"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (true);

-- Create RLS Policies for project_deliverables
CREATE POLICY "Users can view project deliverables"
  ON project_deliverables FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage project deliverables"
  ON project_deliverables FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS Policies for project_risks
CREATE POLICY "Users can view project risks"
  ON project_risks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage project risks"
  ON project_risks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS Policies for project_opportunities
CREATE POLICY "Users can view project opportunities"
  ON project_opportunities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage project opportunities"
  ON project_opportunities FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS Policies for project_communications
CREATE POLICY "Users can view project communications"
  ON project_communications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage project communications"
  ON project_communications FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS Policies for project_documents
CREATE POLICY "Users can view project documents"
  ON project_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage project documents"
  ON project_documents FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create RLS Policies for project_insights
CREATE POLICY "Users can view project insights"
  ON project_insights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage project insights"
  ON project_insights FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_risks_updated_at
  BEFORE UPDATE ON project_risks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_opportunities_updated_at
  BEFORE UPDATE ON project_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
