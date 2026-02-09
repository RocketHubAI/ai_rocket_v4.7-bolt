/*
  # Sync All Users to Public Table

  1. Purpose
    - Ensure all auth.users exist in public.users table
    - Copy team_id, role, and view_financial from auth metadata
    - Create missing user records

  2. Changes
    - Insert/update all users from auth.users to public.users
    - Sync metadata including team_id, role, view_financial

  3. Security
    - Maintains existing RLS policies
    - Ensures data consistency between auth and public tables
*/

-- Sync all users from auth.users to public.users
INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  (au.raw_user_meta_data->>'team_id')::uuid,
  COALESCE(au.raw_user_meta_data->>'role', 'member'),
  COALESCE((au.raw_user_meta_data->>'view_financial')::boolean, true),
  au.created_at,
  au.updated_at
FROM auth.users au
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = COALESCE(EXCLUDED.name, public.users.name),
  team_id = COALESCE(EXCLUDED.team_id, public.users.team_id),
  role = COALESCE(EXCLUDED.role, public.users.role),
  view_financial = COALESCE(EXCLUDED.view_financial, public.users.view_financial),
  updated_at = now();
