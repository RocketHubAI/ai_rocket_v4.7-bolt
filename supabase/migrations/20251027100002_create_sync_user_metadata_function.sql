/*
  # Create function to sync user metadata

  1. New Functions
    - `sync_user_metadata()` - Trigger function to keep auth.users.raw_user_meta_data in sync
    - Automatically updates JWT metadata when public.users changes
    - Ensures RLS policies have access to current team/role info

  2. Purpose
    - Maintain data consistency between public.users and auth.users
    - Enable RLS policies to access team_id and role via JWT
    - Single source of truth: public.users
    - Automatic sync: no manual updates needed
*/

-- Create function to sync team data to auth.users metadata
CREATE OR REPLACE FUNCTION sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users.raw_user_meta_data to match public.users
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{team_id}',
        CASE WHEN NEW.team_id IS NOT NULL
          THEN to_jsonb(NEW.team_id)
          ELSE 'null'::jsonb
        END
      ),
      '{role}',
      to_jsonb(NEW.role)
    ),
    '{view_financial}',
    to_jsonb(NEW.view_financial)
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync metadata
DROP TRIGGER IF EXISTS sync_user_metadata_on_update ON public.users;
CREATE TRIGGER sync_user_metadata_on_update
  AFTER INSERT OR UPDATE OF team_id, role, view_financial ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_metadata();

-- Add helpful comment
COMMENT ON FUNCTION sync_user_metadata IS 'Automatically syncs team_id, role, and view_financial from public.users to auth.users.raw_user_meta_data for JWT access in RLS policies';
