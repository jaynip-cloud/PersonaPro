/*
  # Create Company Profile and Onboarding Schema

  1. New Tables
    - `company_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users, unique)
      - `company_name` (text)
      - `website` (text)
      - `industry` (text)
      - `about` (text)
      - `logo_url` (text)
      - `email` (text)
      - `phone` (text)
      - `linkedin_url` (text)
      - `twitter_url` (text)
      - `facebook_url` (text)
      - `instagram_url` (text)
      - `services` (jsonb, array of service objects)
      - `documents` (jsonb, array of document metadata)
      - `onboarding_completed` (boolean, default false)
      - `onboarding_step` (integer, default 1)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `company_profiles` table
    - Add policy for users to read their own company profile
    - Add policy for users to update their own company profile
    - Add policy for users to insert their own company profile

  3. Functions
    - Create trigger to auto-create company profile when user is created
    - Create trigger to update updated_at timestamp
*/

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text,
  website text,
  industry text,
  about text,
  logo_url text,
  email text,
  phone text,
  linkedin_url text,
  twitter_url text,
  facebook_url text,
  instagram_url text,
  services jsonb DEFAULT '[]'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  onboarding_completed boolean DEFAULT false,
  onboarding_step integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own company profile"
  ON company_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own company profile"
  ON company_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company profile"
  ON company_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at on profile updates
CREATE TRIGGER update_company_profiles_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create company profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_company_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create company profile
DROP TRIGGER IF EXISTS on_user_created_company_profile ON auth.users;
CREATE TRIGGER on_user_created_company_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_company_profile();

-- Create company profiles for existing users
INSERT INTO public.company_profiles (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
