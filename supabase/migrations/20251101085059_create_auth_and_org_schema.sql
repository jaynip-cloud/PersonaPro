/*
  # Create Authentication and Organization Schema

  ## Overview
  Complete multi-tenant authentication system with organizations, memberships,
  knowledge base, and onboarding tracking.

  ## New Tables

  ### 1. `organizations`
  Core company/organization data
  - `id` (uuid, primary key)
  - `name` (text) - Company name
  - `slug` (text, unique) - URL-friendly identifier
  - `website` (text)
  - `industry` (text)
  - `size` (text) - employee count range
  - `country` (text)
  - `city` (text)
  - `about` (text) - Short description
  - `primary_contact_name` (text)
  - `primary_contact_email` (text)
  - `logo_url` (text)
  - `onboarding_completed_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `memberships`
  User to organization relationships
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users)
  - `org_id` (uuid, references organizations)
  - `role` (text) - owner, admin, member
  - `invited_at` (timestamptz)
  - `joined_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 3. `org_social_profiles`
  Social media and online presence
  - `id` (uuid, primary key)
  - `org_id` (uuid, references organizations)
  - `platform` (text) - linkedin, twitter, youtube, instagram, etc.
  - `url` (text)
  - `created_at` (timestamptz)

  ### 4. `org_contacts`
  Additional contact information
  - `id` (uuid, primary key)
  - `org_id` (uuid, references organizations)
  - `type` (text) - support, sales, general
  - `email` (text)
  - `phone` (text)
  - `address` (text)
  - `created_at` (timestamptz)

  ### 5. `org_services`
  Services offered by the organization
  - `id` (uuid, primary key)
  - `org_id` (uuid, references organizations)
  - `name` (text)
  - `description` (text)
  - `tags` (text array)
  - `created_at` (timestamptz)

  ### 6. `org_documents`
  Uploaded company documents
  - `id` (uuid, primary key)
  - `org_id` (uuid, references organizations)
  - `name` (text)
  - `file_url` (text)
  - `file_type` (text)
  - `file_size` (bigint)
  - `uploaded_by` (uuid, references auth.users)
  - `created_at` (timestamptz)

  ### 7. `org_onboarding_state`
  Track onboarding progress
  - `id` (uuid, primary key)
  - `org_id` (uuid, references organizations)
  - `user_id` (uuid, references auth.users)
  - `current_step` (integer) - 1, 2, or 3
  - `step_1_completed` (boolean)
  - `step_2_completed` (boolean)
  - `step_3_completed` (boolean)
  - `step_1_data` (jsonb)
  - `step_2_data` (jsonb)
  - `step_3_data` (jsonb)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access data from organizations they're members of
  - Enforce role-based permissions (owner > admin > member)

  ## Notes
  - Multi-tenant architecture with org_id scoping
  - Supports multiple users per organization
  - Flexible contact and social profile management
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  website text,
  industry text,
  size text,
  country text,
  city text,
  about text,
  primary_contact_name text,
  primary_contact_email text,
  logo_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')) NOT NULL,
  invited_at timestamptz,
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, org_id)
);

-- Create org_social_profiles table
CREATE TABLE IF NOT EXISTS org_social_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create org_contacts table
CREATE TABLE IF NOT EXISTS org_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  type text DEFAULT 'general' CHECK (type IN ('support', 'sales', 'general')) NOT NULL,
  email text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Create org_services table
CREATE TABLE IF NOT EXISTS org_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  tags text[],
  created_at timestamptz DEFAULT now()
);

-- Create org_documents table
CREATE TABLE IF NOT EXISTS org_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create org_onboarding_state table
CREATE TABLE IF NOT EXISTS org_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  current_step integer DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 3),
  step_1_completed boolean DEFAULT false,
  step_2_completed boolean DEFAULT false,
  step_3_completed boolean DEFAULT false,
  step_1_data jsonb,
  step_2_data jsonb,
  step_3_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_id ON memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_org_social_profiles_org_id ON org_social_profiles(org_id);
CREATE INDEX IF NOT EXISTS idx_org_contacts_org_id ON org_contacts(org_id);
CREATE INDEX IF NOT EXISTS idx_org_services_org_id ON org_services(org_id);
CREATE INDEX IF NOT EXISTS idx_org_documents_org_id ON org_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_org_onboarding_state_org_id ON org_onboarding_state(org_id);
CREATE INDEX IF NOT EXISTS idx_org_onboarding_state_user_id ON org_onboarding_state(user_id);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_onboarding_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they are members of"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = organizations.id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update organizations they are owners/admins of"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = organizations.id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = organizations.id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for memberships
CREATE POLICY "Users can view memberships of their organizations"
  ON memberships FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.org_id = memberships.org_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_id
      AND memberships.user_id = auth.uid()
      AND memberships.role IN ('owner', 'admin')
    )
  );

-- RLS Policies for org_social_profiles
CREATE POLICY "Users can view social profiles of their organizations"
  ON org_social_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_social_profiles.org_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage social profiles of their organizations"
  ON org_social_profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_social_profiles.org_id
      AND memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_social_profiles.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- RLS Policies for org_contacts
CREATE POLICY "Users can view contacts of their organizations"
  ON org_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_contacts.org_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage contacts of their organizations"
  ON org_contacts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_contacts.org_id
      AND memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_contacts.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- RLS Policies for org_services
CREATE POLICY "Users can view services of their organizations"
  ON org_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_services.org_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage services of their organizations"
  ON org_services FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_services.org_id
      AND memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_services.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- RLS Policies for org_documents
CREATE POLICY "Users can view documents of their organizations"
  ON org_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_documents.org_id
      AND memberships.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage documents of their organizations"
  ON org_documents FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_documents.org_id
      AND memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.org_id = org_documents.org_id
      AND memberships.user_id = auth.uid()
    )
  );

-- RLS Policies for org_onboarding_state
CREATE POLICY "Users can view their own onboarding state"
  ON org_onboarding_state FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own onboarding state"
  ON org_onboarding_state FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_onboarding_state_updated_at
  BEFORE UPDATE ON org_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name text)
RETURNS text AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to auto-generate slug if not provided
CREATE OR REPLACE FUNCTION set_organization_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name) || '-' || substring(gen_random_uuid()::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_organization_slug_trigger
  BEFORE INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION set_organization_slug();
