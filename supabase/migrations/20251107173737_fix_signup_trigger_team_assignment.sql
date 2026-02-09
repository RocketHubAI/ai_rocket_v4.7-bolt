/*
  # Fix signup trigger to assign team_id from invite codes

  1. Changes
    - Updates `handle_new_user_signup()` function to properly assign team_id from invite codes
    - Ensures new users get their team_id set in auth.users metadata during signup
    - Maintains existing invite code increment functionality

  2. Notes
    - This fixes the bug where users signed up with invite codes but didn't get team_id assigned
    - The team_id is copied from the invite_codes table to the user's metadata
*/

-- Update the signup handler function to also assign team_id
CREATE OR REPLACE FUNCTION handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_invite_code text;
  invite_team_id uuid;
  invite_role text;
  invite_view_financial boolean;
BEGIN
  -- Extract invite code from user metadata
  user_invite_code := NEW.raw_user_meta_data->>'invite_code';

  -- If invite code exists, get team info and increment usage
  IF user_invite_code IS NOT NULL THEN
    -- Get invite code details
    SELECT team_id, assigned_role, view_financial
    INTO invite_team_id, invite_role, invite_view_financial
    FROM invite_codes
    WHERE code = UPPER(user_invite_code)
      AND is_active = true
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

    -- If invite code found and has team_id, update user metadata
    IF invite_team_id IS NOT NULL THEN
      -- Update the user's metadata with team info
      UPDATE auth.users
      SET raw_user_meta_data = jsonb_set(
        jsonb_set(
          jsonb_set(
            raw_user_meta_data,
            '{team_id}',
            to_jsonb(invite_team_id)
          ),
          '{role}',
          to_jsonb(COALESCE(invite_role, 'member'))
        ),
        '{view_financial}',
        to_jsonb(COALESCE(invite_view_financial, true))
      )
      WHERE id = NEW.id;
    END IF;

    -- Increment invite code usage
    UPDATE invite_codes
    SET current_uses = current_uses + 1
    WHERE code = UPPER(user_invite_code)
      AND is_active = true
      AND current_uses < max_uses
      AND (expires_at IS NULL OR expires_at > now());
  END IF;

  RETURN NEW;
END;
$$;
