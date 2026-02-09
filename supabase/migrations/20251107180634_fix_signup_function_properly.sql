/*
  # Fix signup trigger to properly assign team_id
  
  1. Changes
    - Fixes the handle_new_user_signup() function logic
    - First assigns team_id to user BEFORE incrementing invite code usage
    - Ensures invite code validation happens correctly
  
  2. Bug Fix
    - Previous version checked current_uses < max_uses twice, causing race condition
    - Now properly fetches invite data first, assigns it, then increments
*/

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

  -- If invite code exists, process it
  IF user_invite_code IS NOT NULL THEN
    -- Get invite code details (before incrementing)
    SELECT team_id, assigned_role, view_financial
    INTO invite_team_id, invite_role, invite_view_financial
    FROM invite_codes
    WHERE code = UPPER(user_invite_code)
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

    -- If invite code found and valid, update user metadata with team info
    IF invite_team_id IS NOT NULL THEN
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
      
      -- Now increment invite code usage (only if team_id was successfully assigned)
      UPDATE invite_codes
      SET current_uses = current_uses + 1
      WHERE code = UPPER(user_invite_code)
        AND is_active = true
        AND current_uses < max_uses
        AND (expires_at IS NULL OR expires_at > now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
