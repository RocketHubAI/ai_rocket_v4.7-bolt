/*
  # Create function to get user team information

  1. New Functions
    - `get_user_team_info(user_id uuid)` - Returns user data with team name
      - Runs with SECURITY DEFINER to bypass RLS on teams table
      - Returns: team_id, team_name, role, view_financial, user_name
  
  2. Purpose
    - Allows authenticated users to fetch their team name without being blocked by RLS
    - Solves the issue where JWT has old team_id but database has correct team_id
    - Single source of truth: public.users table

  3. Security
    - Function validates that caller is requesting their own data
    - Returns only the caller's information, not other users'
*/

-- Create function to get user team information (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_team_info(p_user_id uuid)
RETURNS TABLE (
  team_id uuid,
  team_name text,
  role text,
  view_financial boolean,
  user_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: only allow users to query their own data
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: can only query own user data';
  END IF;

  RETURN QUERY
  SELECT 
    u.team_id,
    COALESCE(t.name, '') as team_name,
    COALESCE(u.role, 'member') as role,
    COALESCE(u.view_financial, true) as view_financial,
    COALESCE(u.name, '') as user_name
  FROM users u
  LEFT JOIN teams t ON u.team_id = t.id
  WHERE u.id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_team_info(uuid) TO authenticated;
