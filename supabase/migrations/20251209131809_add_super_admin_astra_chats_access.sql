/*
  # Add Super Admin Access to Astra Chats
  
  1. Changes
    - Add policy allowing super admins to view all chats for admin dashboard metrics
  
  2. Security
    - Super admins can view all chats for analytics purposes
    - Regular users can still only see their own chats
*/

CREATE POLICY "Super admins can view all chats"
  ON astra_chats
  FOR SELECT
  TO authenticated
  USING (is_super_admin());