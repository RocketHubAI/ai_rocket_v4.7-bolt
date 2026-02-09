/*
  # Consolidate User Tables

  1. Purpose
    - Ensure public.users table exists and is the single source of truth
    - Migrate data from user_profiles to public.users
    - Eliminate redundant user_profiles table
    - Keep auth.users for authentication (managed by Supabase)

  2. Tables
    - `public.users` - Main user data table
      - id (uuid, primary key, references auth.users)
      - email (text, unique, user's email)
      - name (text, user's display name)
      - is_admin (boolean, admin flag)
      - created_at (timestamptz)
      - updated_at (timestamptz)

  3. Migration Steps
    - Create public.users table if it doesn't exist
    - Migrate data from user_profiles to public.users
    - Drop user_profiles table and related functions/triggers
    - Keep avatars storage bucket for future use

  4. Security
    - Enable RLS on public.users
    - Users can read all user records (for mentions, etc.)
    - Users can only update their own record
*/

-- Create public.users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

-- RLS Policies: All authenticated users can read all user data (for @mentions, etc.)
CREATE POLICY "Authenticated users can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own record
CREATE POLICY "Users can insert own record"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

-- Migrate data from user_profiles to public.users if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    -- Insert users from user_profiles that don't already exist in public.users
    INSERT INTO public.users (id, email, name, created_at, updated_at)
    SELECT
      up.id,
      au.email,
      up.full_name,
      up.created_at,
      up.updated_at
    FROM user_profiles up
    JOIN auth.users au ON au.id = up.id
    WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = up.id)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- Drop user_profiles components if they exist
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP FUNCTION IF EXISTS update_user_profiles_updated_at();
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP TABLE IF EXISTS user_profiles;

-- Add helpful comments
COMMENT ON TABLE public.users IS 'Main user data table. Linked to auth.users for authentication.';
COMMENT ON COLUMN public.users.name IS 'User display name for mentions and chat';
COMMENT ON COLUMN public.users.is_admin IS 'Admin privileges flag';
