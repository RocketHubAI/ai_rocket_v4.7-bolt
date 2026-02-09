/*
  # Fix Workshop Team Creation RLS

  1. Problem
    - Workshop users get 403 when creating teams after signup
    - The session may not be fully established immediately after signUp()

  2. Solution
    - Drop the existing "Allow team creation" policy that may have issues
    - Create a new explicit policy allowing any authenticated user to insert teams
    - The created_by field will track who created it
*/

DROP POLICY IF EXISTS "Allow team creation" ON teams;

CREATE POLICY "Authenticated users can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
