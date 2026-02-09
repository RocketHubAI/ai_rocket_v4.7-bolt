/*
  # Fix RLS policies to allow trigger inserts

  1. Problem
    - Triggers run with SECURITY DEFINER as postgres role
    - RLS policies on public.users and user_feedback_status require auth.uid() = id/user_id
    - During trigger execution, auth.uid() is NULL or doesn't match NEW.id
    - This blocks both triggers from inserting records during signup
    
  2. Solution
    - Modify RLS policies to allow inserts when auth.uid() is NULL (trigger context)
    - OR when current_user is 'postgres' (SECURITY DEFINER context)
    - Keep existing user self-insert functionality
    
  3. Security
    - Only allows NULL auth.uid() for INSERT (which only happens in trigger context)
    - Direct user API calls always have auth.uid() set
    - Maintains security for all non-trigger operations
*/

-- Fix public.users INSERT policy
DROP POLICY IF EXISTS "Allow user self-insert and trigger insert" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;

CREATE POLICY "Users can insert own record or trigger insert"
  ON public.users
  FOR INSERT
  TO authenticated, postgres
  WITH CHECK (
    auth.uid() = id OR auth.uid() IS NULL
  );

COMMENT ON POLICY "Users can insert own record or trigger insert" ON public.users IS 
  'Allows users to insert their own record (auth.uid() = id) and allows triggers to insert when auth.uid() is NULL';

-- Fix user_feedback_status INSERT policy  
DROP POLICY IF EXISTS "Users can insert own status" ON user_feedback_status;

CREATE POLICY "Users can insert own status or trigger insert"
  ON user_feedback_status
  FOR INSERT
  TO authenticated, postgres
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );

COMMENT ON POLICY "Users can insert own status or trigger insert" ON user_feedback_status IS
  'Allows users to insert their own status and allows triggers to insert when auth.uid() is NULL';

-- Grant explicit permissions to postgres role
GRANT INSERT ON public.users TO postgres;
GRANT INSERT ON user_feedback_status TO postgres;
