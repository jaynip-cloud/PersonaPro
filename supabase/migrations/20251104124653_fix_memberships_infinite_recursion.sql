/*
  # Fix Infinite Recursion in Memberships Policies

  1. Changes
    - Drop existing recursive policies on memberships table
    - Create simpler, non-recursive policies
    - Users can view their own memberships directly
    - No nested SELECT queries that cause recursion
  
  2. Security
    - Users can only see memberships where they are a member
    - Users can create memberships for themselves
    - Admins/owners can manage org memberships (checked separately)
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view memberships of their organizations" ON memberships;
DROP POLICY IF EXISTS "Users can create memberships" ON memberships;

-- Create simple, non-recursive SELECT policy
CREATE POLICY "Users can view their own memberships"
  ON memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create simple INSERT policy
CREATE POLICY "Users can insert their own memberships"
  ON memberships FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());