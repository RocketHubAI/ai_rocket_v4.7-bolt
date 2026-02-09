/*
  # Fix infinite recursion in users table SELECT policy

  1. Problem
    - The "Authenticated users can view team members" SELECT policy on the `users` table
      contains a subquery `SELECT u.team_id FROM users u WHERE u.id = auth.uid()`
    - This triggers the same policy again, causing infinite recursion
    - Error: "infinite recursion detected in policy for relation users"
    - This cascades to break ALL policies across the database that reference the users table
      (profile loading, admin dashboard, invite codes, etc.)

  2. Fix
    - Create a `get_my_team_id()` SECURITY DEFINER function that bypasses RLS
    - Replace the self-referencing subquery with a call to this function
    - Also update moonshot and workshop super admin policies to use `is_super_admin()`
      instead of `EXISTS (SELECT 1 FROM users ...)` for consistency

  3. Affected Policies
    - `users` table: "Authenticated users can view team members" (fixed)
    - `moonshot_registrations`: super admin SELECT/UPDATE/DELETE policies (simplified)
    - `workshop_registrations`: super admin SELECT policy (simplified)
*/

-- Step 1: Create helper function that bypasses RLS to get current user's team_id
CREATE OR REPLACE FUNCTION get_my_team_id()
RETURNS uuid AS $$
  SELECT team_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 2: Fix the users table SELECT policy to avoid self-referencing
DROP POLICY IF EXISTS "Authenticated users can view team members" ON users;

CREATE POLICY "Authenticated users can view team members"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR team_id = get_my_team_id()
    OR is_super_admin()
  );

-- Step 3: Fix moonshot_registrations super admin policies to use is_super_admin()
DROP POLICY IF EXISTS "Super admins can view all moonshot registrations" ON moonshot_registrations;
CREATE POLICY "Super admins can view all moonshot registrations"
  ON moonshot_registrations FOR SELECT
  TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can update moonshot registrations" ON moonshot_registrations;
CREATE POLICY "Super admins can update moonshot registrations"
  ON moonshot_registrations FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

DROP POLICY IF EXISTS "Super admins can delete moonshot registrations" ON moonshot_registrations;
CREATE POLICY "Super admins can delete moonshot registrations"
  ON moonshot_registrations FOR DELETE
  TO authenticated
  USING (is_super_admin());

DROP POLICY IF EXISTS "Super admins can insert moonshot registrations" ON moonshot_registrations;
CREATE POLICY "Super admins can insert moonshot registrations"
  ON moonshot_registrations FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

-- Step 4: Fix workshop_registrations super admin policy to use is_super_admin()
DROP POLICY IF EXISTS "Super admins can view all workshop registrations" ON workshop_registrations;
CREATE POLICY "Super admins can view all workshop registrations"
  ON workshop_registrations FOR SELECT
  TO authenticated
  USING (is_super_admin());
