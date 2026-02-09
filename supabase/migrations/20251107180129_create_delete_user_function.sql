/*
  # Create function to completely delete a user from the system
  
  1. New Functions
    - `delete_user_completely(user_id uuid)` - Safely deletes a user from both auth.users and public.users
    - Handles cascading deletes for related data
    - Can only be called by team admins for their team members
  
  2. Security
    - Function uses SECURITY DEFINER to allow deletion from auth schema
    - Includes validation to ensure only team admins can delete team members
    - User cannot delete themselves
  
  3. Important Notes
    - Deleting a user will remove all their data including:
      - User record from auth.users
      - User record from public.users
      - All related sessions
      - All user-specific data (messages, chats, etc. via cascading deletes)
*/

-- Create function to delete user completely
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
  
  -- Target user must be in the same team
  IF target_user_team_id IS NULL OR target_user_team_id != current_user_team_id THEN
    RAISE EXCEPTION 'You can only delete members of your own team';
  END IF;
  
  -- Delete from public.users (cascades will handle related data)
  DELETE FROM public.users WHERE id = target_user_id;
  
  -- Delete all sessions for this user
  DELETE FROM auth.sessions WHERE user_id = target_user_id;
  
  -- Delete from auth.users (this is the critical part that requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = target_user_id;
  
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_completely(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION delete_user_completely IS 'Completely removes a user from the system. Can only be called by team admins to delete their team members.';
