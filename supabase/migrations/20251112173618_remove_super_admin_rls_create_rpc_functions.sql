/*
  # Remove Super Admin RLS and Create Admin RPC Functions
  
  ## Overview
  Removes the super admin RLS policies that were interfering with normal user queries.
  Creates secure RPC functions that the Admin Dashboard can call to get all data.
  
  ## Changes
  1. Drop all super admin RLS policies
  2. Drop the is_super_admin() function
  3. Create RPC functions for admin dashboard data access
  
  ## Security
  - RPC functions check that caller is clay@rockethub.ai
  - Functions use SECURITY DEFINER to bypass RLS when called
  - Normal user queries unaffected
*/

-- Drop all super admin policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE policyname ILIKE '%super admin%') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Drop the is_super_admin function
DROP FUNCTION IF EXISTS is_super_admin();

-- Create admin check function
CREATE OR REPLACE FUNCTION check_is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'clay@rockethub.ai' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users for admin dashboard
CREATE OR REPLACE FUNCTION admin_get_all_users()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  created_at timestamptz,
  team_id uuid,
  role text,
  last_sign_in_at timestamptz
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT 
    u.id,
    au.email,
    u.name,
    u.created_at,
    u.team_id,
    u.role,
    au.last_sign_in_at
  FROM users u
  JOIN auth.users au ON au.id = u.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all teams
CREATE OR REPLACE FUNCTION admin_get_all_teams()
RETURNS TABLE (
  id uuid,
  name text,
  created_at timestamptz,
  created_by uuid
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT t.id, t.name, t.created_at, t.created_by
  FROM teams t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all documents
CREATE OR REPLACE FUNCTION admin_get_all_documents()
RETURNS TABLE (
  id uuid,
  title text,
  source_type text,
  team_id uuid,
  folder_type text,
  created_at timestamptz
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT d.id, d.title, d.source_type, d.team_id, d.folder_type, d.created_at
  FROM documents d;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all chats
CREATE OR REPLACE FUNCTION admin_get_all_chats()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  team_id uuid,
  mode text,
  message text,
  created_at timestamptz
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT ac.id, ac.user_id, ac.team_id, ac.mode, ac.message, ac.created_at
  FROM astra_chats ac;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all reports
CREATE OR REPLACE FUNCTION admin_get_all_reports()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  team_id uuid,
  created_at timestamptz
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT ar.id, ar.user_id, ar.team_id, ar.created_at
  FROM astra_reports ar;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all Gmail connections
CREATE OR REPLACE FUNCTION admin_get_all_gmail_connections()
RETURNS TABLE (
  user_id uuid,
  is_active boolean,
  created_at timestamptz
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT ga.user_id, ga.is_active, ga.created_at
  FROM gmail_auth ga;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all Drive connections
CREATE OR REPLACE FUNCTION admin_get_all_drive_connections()
RETURNS TABLE (
  user_id uuid,
  team_id uuid,
  is_active boolean,
  created_at timestamptz
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT udc.user_id, udc.team_id, udc.is_active, udc.created_at
  FROM user_drive_connections udc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all feedback
CREATE OR REPLACE FUNCTION admin_get_all_feedback()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  created_at timestamptz,
  general_feedback text
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT ufs.id, ufs.user_id, ufs.created_at, ufs.general_feedback
  FROM user_feedback_submissions ufs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all support messages
CREATE OR REPLACE FUNCTION admin_get_all_support_messages()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  created_at timestamptz,
  support_type text,
  support_details jsonb,
  attachment_urls text[]
) AS $$
BEGIN
  PERFORM check_is_super_admin();
  
  RETURN QUERY
  SELECT ufs.id, ufs.user_id, ufs.created_at, ufs.support_type, ufs.support_details, ufs.attachment_urls
  FROM user_feedback_submissions ufs
  WHERE ufs.support_type IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_teams() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_documents() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_chats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_gmail_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_drive_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_feedback() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_all_support_messages() TO authenticated;
