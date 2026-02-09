/*
  # Fix astra_chats RLS and Policies
  
  1. Security Changes
    - Enable Row Level Security on astra_chats table
    - Fix INSERT policy to properly validate user_id
    - Ensure all policies check auth.uid()
    
  2. Critical Fix
    - RLS was disabled, causing chats not to be saved
    - INSERT policy had `WITH CHECK (true)` allowing any insert without validation
    - This is both a security issue and functionality issue
    
  ## IMPORTANT
  This fixes the critical bug where private chats were not being saved to the database.
*/

-- Enable RLS on astra_chats
ALTER TABLE astra_chats ENABLE ROW LEVEL SECURITY;

-- Drop the insecure INSERT policy
DROP POLICY IF EXISTS "Allow inserts for authenticated users" ON astra_chats;

-- Create proper INSERT policy that validates user_id
CREATE POLICY "Users can insert their own chats"
  ON astra_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Verify SELECT policy is correct (it already checks user_id)
-- No changes needed for SELECT policy

-- Verify UPDATE policy is correct (it already checks user_id)
-- No changes needed for UPDATE policy

-- Add DELETE policy for completeness
CREATE POLICY "Users can delete their own chats"
  ON astra_chats
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);