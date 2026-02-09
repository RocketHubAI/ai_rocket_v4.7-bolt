/*
  # Fix users Table Recursive RLS Policy
  
  1. Problem
    - "Admins can update team members" policy has recursive subquery: SELECT FROM users
    - This can cause "permission denied" errors during RLS evaluation
    - The recursive check can fail when policies are being evaluated
    
  2. Solution
    - Create SECURITY DEFINER function to check if user is team admin
    - Replace recursive subquery with function call
    - Function runs with elevated privileges, bypassing RLS during check
    
  3. Security
    - Function validates user is admin of the same team
    - No security compromise - same logic, just bypasses recursive RLS issue
*/

-- Create function to check if user is admin of target user's team
CREATE OR REPLACE FUNCTION is_team_admin_for_user(target_user_id uuid)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  current_user_team_id uuid;
  current_user_role text;
  target_user_team_id uuid;
BEGIN
  -- Get current user's team and role
  SELECT team_id, role INTO current_user_team_id, current_user_role
  FROM public.users
  WHERE id = auth.uid();
  
  -- Get target user's team
  SELECT team_id INTO target_user_team_id
  FROM public.users
  WHERE id = target_user_id;
  
  -- Check if current user is admin and in same team
  RETURN (
    current_user_role = 'admin' AND
    current_user_team_id IS NOT NULL AND
    current_user_team_id = target_user_team_id
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_team_admin_for_user(uuid) TO authenticated;

-- Drop old recursive policy
DROP POLICY IF EXISTS "Admins can update team members" ON users;

-- Create new policy using SECURITY DEFINER function
CREATE POLICY "Admins can update team members"
  ON users
  FOR UPDATE
  TO authenticated
  USING (is_team_admin_for_user(id))
  WITH CHECK (is_team_admin_for_user(id));