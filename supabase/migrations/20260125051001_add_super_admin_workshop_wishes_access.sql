/*
  # Add Super Admin Access to Workshop Wishes

  1. Security Changes
    - Add SELECT policy for super admins to view all workshop wishes
    - This allows the admin dashboard to display workshop wishes analytics

  2. Notes
    - Super admins are identified by their email in the users table
    - Only SELECT access is granted (read-only)
*/

-- Add policy for super admins to read all workshop wishes
CREATE POLICY "Super admins can read all workshop wishes"
  ON workshop_wishes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.email IN (
        'clay@rockethub.ai',
        'jj@rockethub.ai',
        'jjgron@gmail.com',
        'brent@gobundance.com',
        'brent.gove@gmail.com'
      )
    )
  );
