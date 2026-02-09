/*
  # Import Existing Teams to Moonshot Registrations

  Automatically enrolls all existing teams in the Moonshot Challenge with source='existing'.
  This ensures we can track all challenge participants including those who didn't fill out
  the registration form.

  ## Logic
  - Inserts one registration per team
  - Uses the team admin's info (name, email) from auth.users
  - Sets source='existing' to distinguish from form registrations
  - Links team_id and user_id
  - Industry defaults to 'Existing Customer' for auto-enrolled teams
  - Only imports teams that don't already have a registration

  ## Notes
  - Existing form registrations (source='new') are preserved
  - If an existing user later submits the form, a duplicate check should be done in the app
*/

-- Import all existing teams that don't already have a registration
INSERT INTO moonshot_registrations (
  name,
  email,
  team_name,
  industry,
  source,
  team_id,
  user_id,
  created_at
)
SELECT 
  COALESCE(
    u.raw_user_meta_data->>'full_name', 
    u.raw_user_meta_data->>'name', 
    split_part(u.email, '@', 1)
  ) as name,
  u.email,
  t.name as team_name,
  'Existing Customer' as industry,
  'existing' as source,
  t.id as team_id,
  t.created_by as user_id,
  t.created_at
FROM teams t
INNER JOIN auth.users u ON u.id = t.created_by
WHERE NOT EXISTS (
  SELECT 1 FROM moonshot_registrations mr 
  WHERE mr.team_id = t.id
);
