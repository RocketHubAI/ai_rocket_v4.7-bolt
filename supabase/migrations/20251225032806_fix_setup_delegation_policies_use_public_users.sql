/*
  # Fix setup_delegation RLS policies to use public.users

  1. Problem
    - Several policies reference auth.users which causes "permission denied for table users" error
    - Regular users cannot access auth.users table
    
  2. Solution
    - Drop and recreate policies that reference auth.users
    - Replace auth.users references with public.users
    
  3. Affected Policies
    - "Setup admin can update delegation status"
    - "Super admins can manage delegations" 
    - "Users can view own team delegation"
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Setup admin can update delegation status" ON setup_delegation;
DROP POLICY IF EXISTS "Super admins can manage delegations" ON setup_delegation;
DROP POLICY IF EXISTS "Users can view own team delegation" ON setup_delegation;

-- Recreate "Setup admin can update delegation status" using public.users
CREATE POLICY "Setup admin can update delegation status"
  ON setup_delegation
  FOR UPDATE
  TO authenticated
  USING (
    (delegated_to_user_id = auth.uid()) 
    OR (delegated_to_email = (SELECT email FROM public.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    (delegated_to_user_id = auth.uid()) 
    OR (delegated_to_email = (SELECT email FROM public.users WHERE id = auth.uid()))
  );

-- Recreate "Super admins can manage delegations" using public.users
CREATE POLICY "Super admins can manage delegations"
  ON setup_delegation
  FOR ALL
  TO authenticated
  USING (
    (SELECT email FROM public.users WHERE id = auth.uid()) = ANY(ARRAY[
      'clay@rockethub.co',
      'claytondipani@gmail.com',
      'mattpugh22@gmail.com'
    ])
  );

-- Recreate "Users can view own team delegation" using public.users
CREATE POLICY "Users can view own team delegation"
  ON setup_delegation
  FOR SELECT
  TO authenticated
  USING (
    (team_id = (SELECT team_id FROM public.users WHERE id = auth.uid()))
    OR (delegating_user_id = auth.uid())
    OR (delegated_to_user_id = auth.uid())
    OR (delegated_to_email = (SELECT email FROM public.users WHERE id = auth.uid()))
  );