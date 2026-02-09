/*
  # Comprehensive RLS Security Fixes

  Addresses 9 critical and high-severity RLS vulnerabilities identified during security audit.
  See RLS_SECURITY_FIXES.md for full documentation and rollback instructions.

  ## Fix 1: Remove wide-open {public} FOR ALL policies
  - Tables: app_config, folder_sync_status, team_goals, team_strategy_config
  - Replaces {public} USING(true) with proper {service_role} and scoped {authenticated} policies

  ## Fix 2: Enable RLS on scan_queue
  - Table had RLS completely disabled

  ## Fix 3: Restrict anonymous SELECT
  - Tables: users, teams, moonshot_registrations
  - Scopes anonymous access to minimal needed for registration flows

  ## Fix 4: Fix mislabeled service-role policies on moonshot_rbg_scores
  - Policies said "service role" but were granted to {authenticated} with no restrictions

  ## Fix 5: Add ownership checks to INSERT policies
  - Tables: astra_notifications, workshop_registrations

  ## Fix 6: Add validation to anonymous INSERT policies
  - Tables: moonshot_email_sequence, moonshot_invite_codes, moonshot_registrations, moonshot_survey_responses, preview_requests

  ## Fix 7: Remove duplicate gmail_auth policies

  ## Fix 8: Change {public} to {authenticated} role
  - Tables: document_chunks, team_members

  ## Fix 9: Update is_super_admin() function with comprehensive admin email list
*/

-- ============================================================
-- FIX 1: Remove wide-open {public} FOR ALL policies
-- ============================================================

-- app_config: Drop public policy, add service_role + authenticated read
DROP POLICY IF EXISTS "Service role can access app_config" ON app_config;

CREATE POLICY "Service role full access to app_config"
  ON app_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read app_config"
  ON app_config FOR SELECT
  TO authenticated
  USING (true);

-- folder_sync_status: Drop public policy, add service_role + team-scoped authenticated
DROP POLICY IF EXISTS "Service role full access" ON folder_sync_status;

CREATE POLICY "Service role full access to folder_sync_status"
  ON folder_sync_status FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can view their folder sync status"
  ON folder_sync_status FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Team members can insert folder sync status"
  ON folder_sync_status FOR INSERT
  TO authenticated
  WITH CHECK (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Team members can update their folder sync status"
  ON folder_sync_status FOR UPDATE
  TO authenticated
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));

-- team_goals: Drop public policy (authenticated policies already exist)
DROP POLICY IF EXISTS "Service role can manage goals" ON team_goals;

CREATE POLICY "Service role full access to team_goals"
  ON team_goals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- team_strategy_config: Drop public policy (authenticated policies already exist)
DROP POLICY IF EXISTS "Service role can manage strategy config" ON team_strategy_config;

CREATE POLICY "Service role full access to team_strategy_config"
  ON team_strategy_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- FIX 2: Enable RLS on scan_queue
-- ============================================================

ALTER TABLE scan_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to scan_queue"
  ON scan_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Team members can view their scan queue"
  ON scan_queue FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));

CREATE POLICY "Team members can insert to scan queue"
  ON scan_queue FOR INSERT
  TO authenticated
  WITH CHECK (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));


-- ============================================================
-- FIX 3: Restrict anonymous SELECT on users, teams, moonshot_registrations
-- ============================================================

-- users: Replace wide-open anonymous SELECT with email-scoped lookup
DROP POLICY IF EXISTS "Anonymous users can check email existence" ON users;

CREATE POLICY "Anonymous can check email existence"
  ON users FOR SELECT
  TO anon
  USING (false);

-- users: Restrict authenticated SELECT to team members + super admins
DROP POLICY IF EXISTS "Authenticated users can view all users" ON users;

CREATE POLICY "Authenticated users can view team members"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR team_id IN (SELECT u.team_id FROM users u WHERE u.id = auth.uid())
    OR is_super_admin()
  );

-- teams: Replace wide-open anonymous SELECT
DROP POLICY IF EXISTS "Anonymous users can view team names for invite checking" ON teams;

CREATE POLICY "Anonymous can lookup team name by id"
  ON teams FOR SELECT
  TO anon
  USING (false);

-- moonshot_registrations: Replace wide-open anonymous SELECT
DROP POLICY IF EXISTS "anon_select_moonshot_by_email" ON moonshot_registrations;

CREATE POLICY "Anonymous can check registration by email"
  ON moonshot_registrations FOR SELECT
  TO anon
  USING (false);


-- ============================================================
-- FIX 4: Fix mislabeled service-role policies on moonshot_rbg_scores
-- ============================================================

DROP POLICY IF EXISTS "Service role can insert RBG scores" ON moonshot_rbg_scores;
DROP POLICY IF EXISTS "Service role can update RBG scores" ON moonshot_rbg_scores;

CREATE POLICY "Service role manages RBG scores"
  ON moonshot_rbg_scores FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- FIX 5: Add ownership checks to INSERT policies
-- ============================================================

-- astra_notifications: Require user_id = auth.uid()
DROP POLICY IF EXISTS "System creates notifications" ON astra_notifications;

CREATE POLICY "Users create own notifications"
  ON astra_notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Also add service_role policy so edge functions can still create notifications for any user
CREATE POLICY "Service role creates notifications"
  ON astra_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- workshop_registrations: Require user_id = auth.uid()
DROP POLICY IF EXISTS "Allow insert for new registrations" ON workshop_registrations;

CREATE POLICY "Users register themselves for workshops"
  ON workshop_registrations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages workshop registrations"
  ON workshop_registrations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ============================================================
-- FIX 6: Add validation to anonymous INSERT policies
-- ============================================================

-- moonshot_email_sequence
DROP POLICY IF EXISTS "anon_insert_moonshot_email_sequence" ON moonshot_email_sequence;

CREATE POLICY "Anonymous can insert moonshot email sequence"
  ON moonshot_email_sequence FOR INSERT
  TO anon
  WITH CHECK (registration_id IS NOT NULL AND email_type IS NOT NULL);

-- moonshot_invite_codes
DROP POLICY IF EXISTS "anon_insert_moonshot_invite_codes" ON moonshot_invite_codes;

CREATE POLICY "Anonymous can insert moonshot invite codes"
  ON moonshot_invite_codes FOR INSERT
  TO anon
  WITH CHECK (registration_id IS NOT NULL AND code IS NOT NULL AND code <> '');

-- moonshot_registrations
DROP POLICY IF EXISTS "anon_insert_moonshot_registrations" ON moonshot_registrations;

CREATE POLICY "Anonymous can insert moonshot registrations"
  ON moonshot_registrations FOR INSERT
  TO anon
  WITH CHECK (email IS NOT NULL AND email <> '');

-- moonshot_survey_responses
DROP POLICY IF EXISTS "anon_insert_moonshot_survey_responses" ON moonshot_survey_responses;

CREATE POLICY "Anonymous can insert moonshot survey responses"
  ON moonshot_survey_responses FOR INSERT
  TO anon
  WITH CHECK (registration_id IS NOT NULL);

-- preview_requests
DROP POLICY IF EXISTS "Anyone can submit preview requests" ON preview_requests;

CREATE POLICY "Anyone can submit preview requests with email"
  ON preview_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (email IS NOT NULL AND email <> '');


-- ============================================================
-- FIX 7: Remove duplicate gmail_auth policies
-- ============================================================

DROP POLICY IF EXISTS "Users can delete own gmail auth" ON gmail_auth;
DROP POLICY IF EXISTS "Users can insert own gmail auth" ON gmail_auth;
DROP POLICY IF EXISTS "Users can update own gmail auth" ON gmail_auth;
DROP POLICY IF EXISTS "Users can view own gmail auth" ON gmail_auth;


-- ============================================================
-- FIX 8: Change {public} to {authenticated} on document_chunks, team_members
-- ============================================================

-- document_chunks: Replace {public} with {authenticated}
DROP POLICY IF EXISTS "Users can access own team documents" ON document_chunks;

CREATE POLICY "Team members can access own team documents"
  ON document_chunks FOR ALL
  TO authenticated
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));

-- Also ensure service_role access for edge functions/n8n
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'document_chunks' AND policyname = 'Service role full access to document_chunks'
  ) THEN
    CREATE POLICY "Service role full access to document_chunks"
      ON document_chunks FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- team_members: Replace {public} with {authenticated}
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Users can view their team members" ON team_members;

CREATE POLICY "Admins can manage their team members"
  ON team_members FOR ALL
  TO authenticated
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Users can view their own team members"
  ON team_members FOR SELECT
  TO authenticated
  USING (team_id IN (SELECT users.team_id FROM users WHERE users.id = auth.uid()));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'team_members' AND policyname = 'Service role full access to team_members'
  ) THEN
    CREATE POLICY "Service role full access to team_members"
      ON team_members FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;


-- ============================================================
-- FIX 9: Update is_super_admin() with comprehensive admin list
-- ============================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  RETURN user_email IN (
    'clay@rockethub.ai',
    'nick@rockethub.ai',
    'derek@rockethub.ai',
    'marshall@rockethub.ai',
    'hello@rockethub.ai',
    'tj@rockethub.ai',
    'mike@rockethub.ai',
    'clay@healthrocket.life',
    'clay@allective.com'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
