/*
  # Fix signup to properly create public.users with team_id
  
  1. Changes
    - Updates handle_new_user_signup() to also create/update public.users record
    - Ensures both auth.users and public.users have correct team_id
    - Handles the full user creation flow in one place
  
  2. Flow
    - User signs up → auth.users created with metadata
    - Trigger fires AFTER INSERT
    - Function fetches invite code details
    - Function updates auth.users metadata with team_id
    - Function creates/updates public.users with same team_id
    - Function increments invite code usage
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
      -- Update auth.users metadata
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
      
      -- Create or update public.users with correct team info
      INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        invite_team_id,
        COALESCE(invite_role, 'member'),
        COALESCE(invite_view_financial, true),
        NEW.created_at,
        NEW.updated_at
      )
      ON CONFLICT (id) DO UPDATE SET
        team_id = EXCLUDED.team_id,
        role = EXCLUDED.role,
        view_financial = EXCLUDED.view_financial,
        updated_at = now();
      
      -- Now increment invite code usage (only if team_id was successfully assigned)
      UPDATE invite_codes
      SET current_uses = current_uses + 1
      WHERE code = UPPER(user_invite_code)
        AND is_active = true
        AND current_uses < max_uses
        AND (expires_at IS NULL OR expires_at > now());
    END IF;
  ELSE
    -- No invite code, create public.users without team
    INSERT INTO public.users (id, email, name, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user_signup IS 'Handles new user signup: validates invite code, assigns team_id to both auth.users and public.users, and increments invite usage.';
