/*
  # User Category Access Control System

  1. New Tables
    - `user_category_access`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `team_id` (uuid, references teams)
      - `category` (text) - the doc_category from document_chunks (stored as text)
      - `has_access` (boolean) - whether user can access this category
      - `granted_by` (uuid) - who set this access
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - Unique constraint on (user_id, team_id, category)

  2. Security
    - Enable RLS on `user_category_access` table
    - Team creator can manage all users' access
    - Admins can manage members' access only
    - Users can view their own access

  3. Functions
    - `get_team_categories(team_id)` - returns all categories for a team
    - `get_user_accessible_categories(user_id)` - returns categories user can access
    - `initialize_user_category_access(user_id, team_id)` - sets up default access for new user
    - `sync_team_categories(team_id)` - ensures all users have records for all categories

  4. Important Notes
    - Default is ALL access (has_access = true)
    - When new category discovered, auto-grant to all team users
    - Permission hierarchy: Team Creator > Admin > Member
    - Uses doc_category enum column from document_chunks table, cast to text
*/

CREATE TABLE IF NOT EXISTS user_category_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  category text NOT NULL,
  has_access boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, team_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_category_access_user_id ON user_category_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_access_team_id ON user_category_access(team_id);
CREATE INDEX IF NOT EXISTS idx_user_category_access_category ON user_category_access(category);

ALTER TABLE user_category_access ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_team_creator(check_team_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = check_team_id
    AND created_by = check_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_team_admin(check_team_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = check_user_id
    AND team_id = check_team_id
    AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION get_user_role_in_team(check_team_id uuid, check_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM users
  WHERE id = check_user_id
  AND team_id = check_team_id;
$$;

CREATE POLICY "Users can view their own category access"
  ON user_category_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Team creator can view all team category access"
  ON user_category_access
  FOR SELECT
  TO authenticated
  USING (is_team_creator(team_id, auth.uid()));

CREATE POLICY "Admins can view all team category access"
  ON user_category_access
  FOR SELECT
  TO authenticated
  USING (is_team_admin(team_id, auth.uid()));

CREATE POLICY "Team creator can manage all team category access"
  ON user_category_access
  FOR ALL
  TO authenticated
  USING (is_team_creator(team_id, auth.uid()))
  WITH CHECK (is_team_creator(team_id, auth.uid()));

CREATE POLICY "Admins can manage member category access only"
  ON user_category_access
  FOR UPDATE
  TO authenticated
  USING (
    is_team_admin(team_id, auth.uid())
    AND NOT is_team_creator(team_id, auth.uid())
    AND get_user_role_in_team(team_id, user_id) = 'member'
  )
  WITH CHECK (
    is_team_admin(team_id, auth.uid())
    AND NOT is_team_creator(team_id, auth.uid())
    AND get_user_role_in_team(team_id, user_id) = 'member'
  );

CREATE POLICY "Admins can insert member category access"
  ON user_category_access
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_team_admin(team_id, auth.uid())
    AND get_user_role_in_team(team_id, user_id) = 'member'
  );

CREATE OR REPLACE FUNCTION get_team_categories(p_team_id uuid)
RETURNS TABLE(category text, document_count bigint)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    doc_category::text as category,
    COUNT(DISTINCT COALESCE(source_id, google_file_id))::bigint as document_count
  FROM document_chunks
  WHERE team_id = p_team_id
  AND doc_category IS NOT NULL
  GROUP BY doc_category
  ORDER BY doc_category::text;
$$;

CREATE OR REPLACE FUNCTION get_user_accessible_categories(p_user_id uuid)
RETURNS TABLE(category text, has_access boolean)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH user_team AS (
    SELECT team_id FROM users WHERE id = p_user_id
  ),
  all_categories AS (
    SELECT DISTINCT dc.doc_category::text as category
    FROM document_chunks dc
    JOIN user_team ut ON dc.team_id = ut.team_id
    WHERE dc.doc_category IS NOT NULL
  )
  SELECT 
    ac.category,
    COALESCE(uca.has_access, true) as has_access
  FROM all_categories ac
  LEFT JOIN user_category_access uca 
    ON uca.category = ac.category 
    AND uca.user_id = p_user_id
  ORDER BY ac.category;
$$;

CREATE OR REPLACE FUNCTION initialize_user_category_access(
  p_user_id uuid,
  p_team_id uuid,
  p_granted_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_category text;
BEGIN
  FOR v_category IN
    SELECT DISTINCT doc_category::text
    FROM document_chunks
    WHERE team_id = p_team_id
    AND doc_category IS NOT NULL
  LOOP
    INSERT INTO user_category_access (user_id, team_id, category, has_access, granted_by)
    VALUES (p_user_id, p_team_id, v_category, true, p_granted_by)
    ON CONFLICT (user_id, team_id, category) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION sync_team_categories(p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_category text;
BEGIN
  FOR v_category IN
    SELECT DISTINCT doc_category::text
    FROM document_chunks
    WHERE team_id = p_team_id
    AND doc_category IS NOT NULL
  LOOP
    FOR v_user_id IN
      SELECT id FROM users WHERE team_id = p_team_id
    LOOP
      INSERT INTO user_category_access (user_id, team_id, category, has_access)
      VALUES (v_user_id, p_team_id, v_category, true)
      ON CONFLICT (user_id, team_id, category) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION update_user_category_access(
  p_user_id uuid,
  p_category text,
  p_has_access boolean,
  p_granted_by uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id uuid;
  v_target_role text;
  v_grantor_is_creator boolean;
  v_grantor_is_admin boolean;
BEGIN
  SELECT team_id INTO v_team_id FROM users WHERE id = p_user_id;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'User not found or has no team';
  END IF;
  
  SELECT role INTO v_target_role FROM users WHERE id = p_user_id;
  v_grantor_is_creator := is_team_creator(v_team_id, p_granted_by);
  v_grantor_is_admin := is_team_admin(v_team_id, p_granted_by);
  
  IF v_grantor_is_creator THEN
    INSERT INTO user_category_access (user_id, team_id, category, has_access, granted_by, updated_at)
    VALUES (p_user_id, v_team_id, p_category, p_has_access, p_granted_by, now())
    ON CONFLICT (user_id, team_id, category) 
    DO UPDATE SET has_access = p_has_access, granted_by = p_granted_by, updated_at = now();
    RETURN true;
  ELSIF v_grantor_is_admin AND v_target_role = 'member' THEN
    INSERT INTO user_category_access (user_id, team_id, category, has_access, granted_by, updated_at)
    VALUES (p_user_id, v_team_id, p_category, p_has_access, p_granted_by, now())
    ON CONFLICT (user_id, team_id, category) 
    DO UPDATE SET has_access = p_has_access, granted_by = p_granted_by, updated_at = now();
    RETURN true;
  ELSE
    RAISE EXCEPTION 'Insufficient permissions to modify category access';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_team_member_category_access(p_team_id uuid)
RETURNS TABLE(
  user_id uuid,
  email text,
  name text,
  role text,
  category text,
  has_access boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH team_categories AS (
    SELECT DISTINCT dc.doc_category::text as category
    FROM document_chunks dc
    WHERE dc.team_id = p_team_id
    AND dc.doc_category IS NOT NULL
  ),
  team_members AS (
    SELECT u.id, u.email, u.name, u.role
    FROM users u
    WHERE u.team_id = p_team_id
  )
  SELECT 
    tm.id as user_id,
    tm.email,
    tm.name,
    tm.role,
    tc.category,
    COALESCE(uca.has_access, true) as has_access
  FROM team_members tm
  CROSS JOIN team_categories tc
  LEFT JOIN user_category_access uca 
    ON uca.user_id = tm.id 
    AND uca.category = tc.category
    AND uca.team_id = p_team_id
  ORDER BY tm.email, tc.category;
$$;
