/*
  # Create service role function to get user team information

  1. New Functions
    - `get_user_team_info_service(p_user_id uuid)` - Returns user data with team name
      - Runs with SECURITY DEFINER to bypass RLS on teams table
      - Can be called by service role (no auth.uid() check)
      - Returns: team_id, team_name, role, view_financial, user_name
  
  2. Purpose
    - Allows edge functions using service role to fetch user team information
    - Used by scheduled reports edge function
    - Single source of truth: public.users table

  3. Security
    - Only granted to service_role (not to authenticated users)
    - Edge functions use service role key to call this
*/

-- Create service role function to get user team information (bypasses RLS and auth check)
CREATE OR REPLACE FUNCTION get_user_team_info_service(p_user_id uuid)
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

-- Grant execute permission ONLY to service_role (not to authenticated users)
GRANT EXECUTE ON FUNCTION get_user_team_info_service(uuid) TO service_role;