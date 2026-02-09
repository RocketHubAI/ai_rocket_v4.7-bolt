/*
  # Fix Admin Dashboard RPC Function
  
  ## Overview
  Fixes the admin_get_dashboard_data function to use correct column names
  based on actual schema.
  
  ## Changes
  - Remove team_id reference from astra_reports (doesn't exist)
  - Ensure all queries use correct column names
*/

CREATE OR REPLACE FUNCTION admin_get_dashboard_data()
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  users_data jsonb;
  teams_data jsonb;
  documents_data jsonb;
  chats_data jsonb;
  reports_data jsonb;
  gmail_data jsonb;
  drive_data jsonb;
  feedback_data jsonb;
BEGIN
  -- Check admin status
  PERFORM check_is_super_admin();
  
  -- Get all users with auth data
  SELECT jsonb_agg(row_to_json(t))
  INTO users_data
  FROM (
    SELECT 
      u.id,
      au.email,
      u.name,
      u.created_at,
      u.team_id,
      u.role,
      au.last_sign_in_at
    FROM users u
    JOIN auth.users au ON au.id = u.id
    ORDER BY u.created_at DESC
  ) t;
  
  -- Get all teams
  SELECT jsonb_agg(row_to_json(t))
  INTO teams_data
  FROM (
    SELECT id, name, created_at, created_by
    FROM teams
    ORDER BY created_at DESC
  ) t;
  
  -- Get all documents
  SELECT jsonb_agg(row_to_json(t))
  INTO documents_data
  FROM (
    SELECT id, title, source_type, team_id, folder_type, created_at
    FROM documents
    ORDER BY created_at DESC
  ) t;
  
  -- Get all chats (both private and team)
  SELECT jsonb_agg(row_to_json(t))
  INTO chats_data
  FROM (
    SELECT 
      id, 
      user_id, 
      NULL::uuid as team_id,
      'private'::text as mode, 
      message, 
      created_at
    FROM astra_chats
    UNION ALL
    SELECT 
      id,
      user_id,
      team_id,
      'team'::text as mode,
      message,
      created_at
    FROM astra_team_messages
    ORDER BY created_at DESC
  ) t;
  
  -- Get all reports (no team_id column exists)
  SELECT jsonb_agg(row_to_json(t))
  INTO reports_data
  FROM (
    SELECT id, user_id, created_at
    FROM astra_reports
    ORDER BY created_at DESC
  ) t;
  
  -- Get all Gmail connections
  SELECT jsonb_agg(row_to_json(t))
  INTO gmail_data
  FROM (
    SELECT user_id, is_active, created_at
    FROM gmail_auth
  ) t;
  
  -- Get all Drive connections
  SELECT jsonb_agg(row_to_json(t))
  INTO drive_data
  FROM (
    SELECT user_id, team_id, is_active, created_at
    FROM user_drive_connections
  ) t;
  
  -- Get all feedback and support messages
  SELECT jsonb_agg(row_to_json(t))
  INTO feedback_data
  FROM (
    SELECT 
      ufs.id,
      ufs.user_id,
      ufs.created_at,
      ufs.submitted_at,
      ufs.general_feedback,
      ufs.support_type,
      ufs.support_details,
      ufs.attachment_urls
    FROM user_feedback_submissions ufs
    ORDER BY ufs.created_at DESC
  ) t;
  
  -- Build result object
  result := jsonb_build_object(
    'users', COALESCE(users_data, '[]'::jsonb),
    'teams', COALESCE(teams_data, '[]'::jsonb),
    'documents', COALESCE(documents_data, '[]'::jsonb),
    'chats', COALESCE(chats_data, '[]'::jsonb),
    'reports', COALESCE(reports_data, '[]'::jsonb),
    'gmail_connections', COALESCE(gmail_data, '[]'::jsonb),
    'drive_connections', COALESCE(drive_data, '[]'::jsonb),
    'feedback', COALESCE(feedback_data, '[]'::jsonb)
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
