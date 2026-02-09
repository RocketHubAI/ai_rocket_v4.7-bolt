/*
  # Add Last Active Tracking

  1. Changes
    - Add `last_active_at` column to users table
    - Create function to update last_active_at timestamp
    - Add RLS policy to allow users to update their own last_active_at

  2. Purpose
    - Track when users last interacted with the app (not just sign-in)
    - Provides more accurate activity metrics for admin dashboard
*/

-- Add last_active_at column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_active_at'
  ) THEN
    ALTER TABLE users ADD COLUMN last_active_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Initialize last_active_at with created_at for existing users
UPDATE users
SET last_active_at = created_at
WHERE last_active_at IS NULL;

-- Create function to update last_active_at (can be called from client)
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users
  SET last_active_at = now()
  WHERE id = auth.uid();
END;
$$;

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION update_user_last_active() TO authenticated;

-- Add RLS policy to allow users to update their own last_active_at
CREATE POLICY "Users can update own last_active_at"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
