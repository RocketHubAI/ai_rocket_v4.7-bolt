/*
  # Add Additional Super Admins

  1. Changes
    - Update is_super_admin() function to include derek@rockethub.ai and marshall@rockethub.ai
    - These users will have full access to all admin dashboard features
    - All existing RLS policies that use is_super_admin() will automatically apply

  2. Security
    - Function checks user email from auth.users table
    - Returns true only for authorized super admin emails
*/

-- Update function to include additional super admin emails
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT email FROM auth.users WHERE id = auth.uid()
  ) IN ('clay@rockethub.ai', 'derek@rockethub.ai', 'marshall@rockethub.ai');
END;
$$;
