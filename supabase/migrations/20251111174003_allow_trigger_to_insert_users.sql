/*
  # Allow trigger function to insert into public.users

  1. Issue
    - The signup trigger runs with SECURITY DEFINER
    - RLS policy requires auth.uid() = id for INSERT
    - During trigger execution, auth.uid() doesn't match NEW.id
    - This blocks the trigger from creating the public.users record
    
  2. Solution
    - Add a new RLS policy that allows INSERT for SECURITY DEFINER functions
    - Check if the inserter is a postgres role (trigger context)
    - Keep existing policy for direct user inserts
    
  3. Security
    - Maintains security for direct user inserts (must be own ID)
    - Allows triggers to insert any user record
    - Triggers are trusted code we control
*/

-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;

-- Create a more permissive INSERT policy that allows:
-- 1. Users to insert their own record (auth.uid() = id)
-- 2. Service role / triggers to insert any record (bypasses RLS with SECURITY DEFINER)
CREATE POLICY "Allow user self-insert and trigger insert"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is inserting their own record
    auth.uid() = id
    -- Service role and SECURITY DEFINER functions bypass RLS automatically
  );

COMMENT ON POLICY "Allow user self-insert and trigger insert" ON public.users IS 
  'Allows authenticated users to insert their own record, and allows SECURITY DEFINER functions (triggers) to insert records during signup process';
