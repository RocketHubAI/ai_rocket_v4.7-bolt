/*
  # Fix RLS policies that reference auth.users directly

  1. Problem
    - Several RLS policies use `SELECT email FROM auth.users WHERE id = auth.uid()`
    - The `authenticated` role does not have SELECT permission on `auth.users`
    - This causes "permission denied for table users" errors on any query to these tables

  2. Fix
    - Replace `auth.users` subqueries with `auth.jwt() ->> 'email'`
    - The JWT token includes the email claim, so no table access is needed

  3. Affected Tables
    - `user_scheduled_tasks` - super admin view policy
    - `scheduled_task_executions` - super admin view policy
    - `admin_invites` - admin view, update, and user check policies
    - `launch_preparation_eligible_users` - user check policy
    - `support_message_history` - super admin view policy
*/

-- Fix user_scheduled_tasks super admin policy
DROP POLICY IF EXISTS "Super admins can view all scheduled tasks" ON user_scheduled_tasks;
CREATE POLICY "Super admins can view all scheduled tasks"
  ON user_scheduled_tasks
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = ANY (ARRAY['clay@rockethub.ai', 'john@rockethub.ai'])
  );

-- Fix scheduled_task_executions super admin policy
DROP POLICY IF EXISTS "Super admins can view all task executions" ON scheduled_task_executions;
CREATE POLICY "Super admins can view all task executions"
  ON scheduled_task_executions
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = ANY (ARRAY['clay@rockethub.ai', 'john@rockethub.ai'])
  );

-- Fix admin_invites policies
DROP POLICY IF EXISTS "Admin can view invites" ON admin_invites;
CREATE POLICY "Admin can view invites"
  ON admin_invites
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'clay@rockethub.ai'
  );

DROP POLICY IF EXISTS "Admin can update invites" ON admin_invites;
CREATE POLICY "Admin can update invites"
  ON admin_invites
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'clay@rockethub.ai'
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'clay@rockethub.ai'
  );

DROP POLICY IF EXISTS "Users can check own invite status" ON admin_invites;
CREATE POLICY "Users can check own invite status"
  ON admin_invites
  FOR SELECT
  TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
    AND status = 'pending'
    AND expires_at > now()
  );

-- Fix launch_preparation_eligible_users policy
DROP POLICY IF EXISTS "Users can check their own legacy status" ON launch_preparation_eligible_users;
CREATE POLICY "Users can check their own legacy status"
  ON launch_preparation_eligible_users
  FOR SELECT
  TO authenticated
  USING (
    email = (auth.jwt() ->> 'email')
  );

-- Fix support_message_history policy
DROP POLICY IF EXISTS "Super admins can view all message history" ON support_message_history;
CREATE POLICY "Super admins can view all message history"
  ON support_message_history
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'clay@rockethub.ai'
  );
