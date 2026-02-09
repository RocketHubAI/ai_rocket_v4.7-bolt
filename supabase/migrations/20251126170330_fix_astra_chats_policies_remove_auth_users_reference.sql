/*
  # Fix astra_chats RLS Policies - Remove auth.users References
  
  1. Problem
    - SELECT and UPDATE policies reference auth.users table
    - auth.users cannot be queried by authenticated users (security restriction)
    - This causes "permission denied for table users" error
    
  2. Solution
    - Remove auth.users references from policies
    - Use public.users table for admin checks instead
    - Simplify policies to only check user_id = auth.uid()
    
  3. Security
    - Users can only access their own chats
    - Super admin access handled by separate policy
    - All policies properly validate user identity
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their own chat history" ON astra_chats;
DROP POLICY IF EXISTS "Users can update their own chats" ON astra_chats;
DROP POLICY IF EXISTS "Users can insert their own chats" ON astra_chats;
DROP POLICY IF EXISTS "Allow inserts for authenticated users" ON astra_chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON astra_chats;

-- Create simple, secure policies without auth.users references

-- SELECT: Users can only view their own chats
CREATE POLICY "Users can view their own chats"
  ON astra_chats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can only insert chats with their own user_id
CREATE POLICY "Users can insert their own chats"
  ON astra_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can only update their own chats
CREATE POLICY "Users can update their own chats"
  ON astra_chats
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- DELETE: Users can delete their own chats
CREATE POLICY "Users can delete their own chats"
  ON astra_chats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Note: Super admin access is already handled by separate "Super admin can view all chats" policy