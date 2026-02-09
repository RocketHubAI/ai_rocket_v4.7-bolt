/*
  # Fix delete_user_completely to handle users with null team_id
  
  1. Changes
    - Allows deletion of users who have null team_id
    - Admins can delete any user who either has no team or is in their team
    - Prevents accidental cross-team deletions
  
  2. Security
    - Still requires admin role
    - Still prevents self-deletion
    - More permissive for cleanup of orphaned users
*/

CREATE OR REPLACE FUNCTION delete_user_completely(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  current_user_team_id uuid;
  target_user_team_id uuid;
BEGIN
  -- Get current user info
  current_user_id := auth.uid();
  
  -- Cannot delete yourself
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account';
  END IF;
  
  -- Get current user's role and team_id from public.users
  SELECT role, team_id INTO current_user_role, current_user_team_id
  FROM users
  WHERE id = current_user_id;
  
  -- Must be an admin
  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only team administrators can delete users';
  END IF;
  
  -- Get target user's team_id
  SELECT team_id INTO target_user_team_id
  FROM users
  WHERE id = target_user_id;
  
  -- Target user must be in the same team OR have no team (orphaned)
  -- Admins can clean up orphaned users or remove their own team members
  IF target_user_team_id IS NOT NULL AND target_user_team_id != current_user_team_id THEN
    RAISE EXCEPTION 'You can only delete members of your own team';
  END IF;
  
  -- Delete from public.users first (cascades will handle related data)
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- Delete all sessions for this user
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  
  -- Delete from auth.users (this requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_user_id;
  
END;
$$;

-- Add comment explaining the change
COMMENT ON FUNCTION delete_user_completely IS 'Completely removes a user from the system. Admins can delete their team members or orphaned users (team_id = null).';
