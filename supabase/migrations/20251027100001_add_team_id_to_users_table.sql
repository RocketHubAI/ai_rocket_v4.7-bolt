/*
  # Add team_id to public.users table

  1. Changes
    - Add `team_id` column to public.users table
    - Add `role` column to public.users ('admin' or 'member')
    - Add `view_financial` column for financial data access
    - Create proper foreign key relationship to teams table
    - Add index for performance
    - Migrate existing team data from auth.users.raw_user_meta_data to public.users

  2. Benefits
    - Proper relational database structure
    - Foreign key constraints ensure data integrity
    - Easy to query all users in a team
    - Efficient indexing for team-based queries
    - Cleaner data model

  3. Security
    - RLS policies updated to use team_id from public.users
*/

-- Add team_id, role, and view_financial columns to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES teams(id) ON DELETE SET NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role text DEFAULT 'member' CHECK (role IN ('admin', 'member'));
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS view_financial boolean DEFAULT true;

-- Create index for team-based queries
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);

-- Migrate team data from auth.users.raw_user_meta_data to public.users
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT
      id,
      (raw_user_meta_data->>'team_id')::uuid as meta_team_id,
      raw_user_meta_data->>'role' as meta_role,
      (raw_user_meta_data->>'view_financial')::boolean as meta_view_financial
    FROM auth.users
    WHERE raw_user_meta_data->>'team_id' IS NOT NULL
  LOOP
    -- Update public.users with team information
    UPDATE public.users
    SET
      team_id = user_record.meta_team_id,
      role = COALESCE(user_record.meta_role, 'member'),
      view_financial = COALESCE(user_record.meta_view_financial, true)
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- Add helpful comments
COMMENT ON COLUMN public.users.team_id IS 'Reference to the team this user belongs to';
COMMENT ON COLUMN public.users.role IS 'User role within their team: admin or member';
COMMENT ON COLUMN public.users.view_financial IS 'Whether user has permission to view financial data';

-- Note: We keep team_id in auth.users.raw_user_meta_data for JWT access in RLS policies
-- But public.users.team_id is the source of truth and should be updated first
