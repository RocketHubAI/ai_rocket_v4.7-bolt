/*
  # Fix new team signup to ignore invite code defaults

  1. Issue
    - invite_codes table has defaults: assigned_role='member', view_financial=true
    - When creating "new team" invite (team_id=NULL), these defaults confuse the signup trigger
    - Trigger should only use these values when joining EXISTING team
    
  2. Solution
    - Update signup trigger to ignore assigned_role/view_financial when team_id is NULL
    - For new team creation, always use role='admin' and view_financial=true
    - Only use invite's assigned_role/view_financial when joining existing team
    
  3. Security
    - Maintains all existing security measures
    - No changes to RLS policies
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
  new_team_name text;
  created_team_id uuid;
  error_message text;
BEGIN
  BEGIN
    -- Extract invite code and new team name from user metadata
    user_invite_code := NEW.raw_user_meta_data->>'invite_code';
    new_team_name := NEW.raw_user_meta_data->>'new_team_name';
    
    RAISE NOTICE 'Processing signup for user % with invite code % and new_team_name %', NEW.id, user_invite_code, new_team_name;

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

      -- SCENARIO 1: Creating a new team (invite has no team_id AND user provided team name)
      -- Ignore assigned_role/view_financial from invite when creating new team
      IF invite_team_id IS NULL AND new_team_name IS NOT NULL AND TRIM(new_team_name) != '' THEN
        -- Create the team
        INSERT INTO teams (name, created_at, updated_at)
        VALUES (TRIM(new_team_name), now(), now())
        RETURNING id INTO created_team_id;
        
        RAISE NOTICE 'Created new team "%" with id %', new_team_name, created_team_id;
        
        -- Update auth.users metadata with new team info (always admin for new team)
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
          'role', 'admin',
          'team_id', created_team_id,
          'email_verified', COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, true),
          'view_financial', true,
          'invite_code', UPPER(user_invite_code),
          'team_name', TRIM(new_team_name)
        )
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Updated auth.users metadata for user % with new team', NEW.id;
        
        -- Create public.users record with admin role
        INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          created_team_id,
          'admin',
          true,
          NEW.created_at,
          NEW.updated_at
        )
        ON CONFLICT (id) DO UPDATE SET
          team_id = EXCLUDED.team_id,
          role = EXCLUDED.role,
          view_financial = EXCLUDED.view_financial,
          updated_at = now();
        
        RAISE NOTICE 'Created public.users record for user % as admin of new team', NEW.id;
        
        -- Increment invite code usage
        UPDATE invite_codes
        SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses
          AND (expires_at IS NULL OR expires_at > now());
        
        RAISE NOTICE 'Incremented invite code usage for %', user_invite_code;
        
      -- SCENARIO 2: Joining existing team (invite has team_id)
      -- Use assigned_role/view_financial from invite
      ELSIF invite_team_id IS NOT NULL THEN
        -- Update auth.users metadata with team info
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_build_object(
          'role', COALESCE(invite_role, 'member'),
          'team_id', invite_team_id,
          'email_verified', COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, true),
          'view_financial', COALESCE(invite_view_financial, true),
          'invite_code', UPPER(user_invite_code)
        )
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Updated auth.users metadata for user % joining existing team', NEW.id;
        
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
        
        RAISE NOTICE 'Created/updated public.users record for user % joining existing team', NEW.id;
        
        -- Increment invite code usage
        UPDATE invite_codes
        SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses
          AND (expires_at IS NULL OR expires_at > now());
        
        RAISE NOTICE 'Incremented invite code usage for %', user_invite_code;
        
      -- SCENARIO 3: Invalid invite (no team_id and no team_name provided)
      ELSE
        RAISE EXCEPTION 'Invalid signup: invite code has no team and no new team name provided';
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

COMMENT ON FUNCTION handle_new_user_signup IS 'Handles new user signup: validates invite code, creates team if needed (ignoring invite defaults for new teams), assigns user to team with appropriate role, creates public.users record, and increments invite usage. Supports both joining existing teams and creating new teams.';
