/*
  # Add comprehensive error logging to signup function

  1. Purpose
    - Add detailed error logging to identify signup failures
    - Log each step of the signup process
    - Capture and raise detailed error messages
    
  2. Changes
    - Add RAISE NOTICE statements for debugging
    - Add proper exception handling with detailed messages
    - Ensure errors are visible to the application
    
  3. Security
    - Maintains SECURITY DEFINER for necessary permissions
    - Does not expose sensitive information in logs
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
  error_message text;
BEGIN
  BEGIN
    -- Extract invite code from user metadata
    user_invite_code := NEW.raw_user_meta_data->>'invite_code';
    RAISE NOTICE 'Processing signup for user % with invite code %', NEW.id, user_invite_code;

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

      RAISE NOTICE 'Invite code details - team_id: %, role: %, view_financial: %', invite_team_id, invite_role, invite_view_financial;

      -- If invite code found and valid, update user metadata with team info
      IF invite_team_id IS NOT NULL THEN
        -- Update auth.users metadata with clean, minimal fields
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
          'role', COALESCE(invite_role, 'member'),
          'team_id', invite_team_id,
          'email_verified', COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, true),
          'view_financial', COALESCE(invite_view_financial, true),
          'invite_code', UPPER(user_invite_code)
        )
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Updated auth.users metadata for user %', NEW.id;
        
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
        
        RAISE NOTICE 'Created/updated public.users record for user %', NEW.id;
        
        -- Now increment invite code usage (only if team_id was successfully assigned)
        UPDATE invite_codes
        SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses
          AND (expires_at IS NULL OR expires_at > now());
        
        RAISE NOTICE 'Incremented invite code usage for %', user_invite_code;
      ELSE
        -- Invite code provided but no valid team found
        -- Still create the user record without team
        INSERT INTO public.users (id, email, name, created_at, updated_at)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          NEW.created_at,
          NEW.updated_at
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created public.users record without team for user %', NEW.id;
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
      
      RAISE NOTICE 'Created public.users record without invite code for user %', NEW.id;
    END IF;

    RETURN NEW;
    
  EXCEPTION WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE WARNING 'Error in handle_new_user_signup for user %: %', NEW.id, error_message;
    -- Re-raise the error so it's visible to the application
    RAISE EXCEPTION 'Database error saving new user: %', error_message;
  END;
END;
$$;

COMMENT ON FUNCTION handle_new_user_signup IS 'Handles new user signup: validates invite code, assigns clean metadata to auth.users, creates public.users record, and increments invite usage. Includes detailed error logging.';
