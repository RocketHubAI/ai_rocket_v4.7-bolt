/*
  # Fix What's New RLS Policy

  1. Changes
    - Drop existing super admin policy that queries auth.users
    - Create simpler super admin policy using user metadata
    - Keep the authenticated users read policy as-is

  2. Security
    - All authenticated users can view published What's New items
    - Only super admins can create/update/delete items
*/

-- Drop the problematic super admin policy
DROP POLICY IF EXISTS "Super admins can manage whats new" ON whats_new;

-- Create new super admin policy using user metadata instead of auth.users table
CREATE POLICY "Super admins can manage whats new"
  ON whats_new
  FOR ALL
  TO authenticated
  USING (
    auth.jwt()->>'email' IN (
      'clay@rockethub.co',
      'claytondipani@gmail.com',
      'mattpugh22@gmail.com'
    )
  )
  WITH CHECK (
    auth.jwt()->>'email' IN (
      'clay@rockethub.co',
      'claytondipani@gmail.com',
      'mattpugh22@gmail.com'
    )
  );
