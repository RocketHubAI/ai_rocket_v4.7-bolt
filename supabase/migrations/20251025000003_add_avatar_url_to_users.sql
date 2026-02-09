/*
  # Add Avatar URL to Users Table

  1. Changes
    - Add `avatar_url` column to public.users table
    - Column stores URL to user's avatar image in Supabase Storage

  2. Notes
    - Avatars are stored in the 'avatars' storage bucket
    - Storage policies already exist from previous user_profiles setup
*/

-- Add avatar_url column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.users ADD COLUMN avatar_url text NULL;
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.users.avatar_url IS 'URL to user avatar image stored in Supabase Storage';
