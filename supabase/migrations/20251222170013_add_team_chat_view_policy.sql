/*
  # Add Team Chat View Policy

  ## Problem
  The current RLS policy for astra_chats only allows users to view their own messages.
  This prevents team members from seeing each other's messages in team chat mode.

  ## Solution
  Add a new SELECT policy that allows team members to view all team chat messages
  from users in the same team.

  ## Changes
  1. Add new policy "Team members can view team chats" that allows authenticated
     users to view team mode messages from users in the same team.

  ## Security
  - Only applies to mode = 'team' messages
  - Checks that the viewer is in the same team as the message author
  - Private chats remain private (only visible to author)
*/

CREATE POLICY "Team members can view team chats"
  ON astra_chats
  FOR SELECT
  TO authenticated
  USING (
    mode = 'team'
    AND (
      SELECT team_id FROM users WHERE users.id = auth.uid()
    ) = (
      SELECT team_id FROM users WHERE users.id = astra_chats.user_id
    )
  );
