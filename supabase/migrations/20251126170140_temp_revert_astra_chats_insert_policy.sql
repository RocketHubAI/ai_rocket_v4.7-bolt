/*
  # Temporarily Revert INSERT Policy for Testing
  
  This temporarily reverts to the old insecure policy to test if RLS is the issue.
  THIS IS FOR TESTING ONLY - WILL BE FIXED PROPERLY AFTER CONFIRMATION
*/

-- Drop current INSERT policy
DROP POLICY IF EXISTS "Users can insert their own chats" ON astra_chats;

-- Recreate old policy (insecure but should work)
CREATE POLICY "Allow inserts for authenticated users"
  ON astra_chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);