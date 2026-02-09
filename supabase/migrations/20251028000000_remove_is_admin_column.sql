/*
  # Remove Legacy is_admin Column

  1. Purpose
    - Remove the deprecated is_admin boolean column from users table
    - The application now uses the role column ('admin' or 'member') instead
    - This eliminates redundancy and potential confusion

  2. Changes
    - Drop the is_admin column from public.users table
    - All admin status checks now use role = 'admin'

  3. Notes
    - Data is preserved in the role column
    - This is a safe operation as the column is no longer referenced in code
*/

-- Drop the legacy is_admin column
ALTER TABLE public.users DROP COLUMN IF EXISTS is_admin;
