/*
  # Fix Signup Function - Robust New Team Handling
  
  ## Problem
  The signup function was failing for new team signups because SCENARIO 4 was being
  triggered when `pending_team_setup` wasn't properly passed from the frontend.
  
  The strict scenario matching required:
  - SCENARIO 1: team_id=NULL AND new_team_name IS NOT NULL
  - SCENARIO 2: team_id IS NOT NULL  
  - SCENARIO 3: team_id=NULL AND pending_team_setup=TRUE
  - SCENARIO 4: Everything else (ERROR)
  
  When pending_team_setup was false/missing, new team signups hit SCENARIO 4 and failed.
  
  ## Solution
  Simplify the logic: If an invite code exists with team_id=NULL (new team invite),
  always treat it as a new team signup (create user without team, team will be
  created during onboarding).
  
  ## Changes
  - Merged SCENARIO 3 and 4 into a single case for new team invites
  - If team_id IS NULL and invite code is valid, create user without team
  - Removed dependency on pending_team_setup flag for new team detection
*/

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_invite_code text;
  invite_team_id uuid;
  invite_role text;
  invite_view_financial boolean;
  invite_found boolean := false;
  new_team_name text;
  created_team_id uuid;
  error_message text;
  error_detail text;
  error_hint text;
BEGIN
  RAISE NOTICE '=== SIGNUP TRIGGER START for user % ===', NEW.id;
  RAISE NOTICE 'User email: %', NEW.email;
  RAISE NOTICE 'Raw metadata: %', NEW.raw_user_meta_data;

  BEGIN
    -- Extract invite code and new team name from user metadata
    user_invite_code := NEW.raw_user_meta_data->>'invite_code';
    new_team_name := NEW.raw_user_meta_data->>'new_team_name';

    RAISE NOTICE 'Extracted - invite_code: %, new_team_name: %', user_invite_code, new_team_name;

    -- If invite code exists, process it
    IF user_invite_code IS NOT NULL THEN
      RAISE NOTICE 'Processing invite code: %', user_invite_code;

      -- Get invite code details
      SELECT team_id, assigned_role, view_financial, true
      INTO invite_team_id, invite_role, invite_view_financial, invite_found
      FROM invite_codes
      WHERE code = UPPER(user_invite_code)
        AND is_active = true
        AND current_uses < max_uses
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;

      RAISE NOTICE 'Invite lookup - found: %, team_id: %, role: %, view_financial: %', 
                   invite_found, invite_team_id, invite_role, invite_view_financial;

      -- Check if invite code was found and valid
      IF NOT COALESCE(invite_found, false) THEN
        RAISE NOTICE 'Invite code not found or invalid, creating basic user without team';
        
        -- Create basic user without team (they used an invalid/expired code)
        INSERT INTO public.users (id, email, name, created_at, updated_at)
        VALUES (
          NEW.id,
          NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          NEW.created_at,
          NEW.updated_at
        )
        ON CONFLICT (id) DO NOTHING;

        RAISE NOTICE '=== SIGNUP TRIGGER COMPLETE (invalid invite code) ===';
        RETURN NEW;
      END IF;

      -- SCENARIO 1: Creating a new team with team name provided during signup
      IF invite_team_id IS NULL AND new_team_name IS NOT NULL AND TRIM(new_team_name) != '' THEN
        RAISE NOTICE 'SCENARIO 1: Creating new team "%"', new_team_name;

        -- Create the team
        BEGIN
          INSERT INTO teams (name, created_at, updated_at)
          VALUES (TRIM(new_team_name), now(), now())
          RETURNING id INTO created_team_id;

          RAISE NOTICE 'SUCCESS: Created team with id %', created_team_id;
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
          RAISE EXCEPTION 'Failed to create team: % (Detail: %, Hint: %)', error_message, error_detail, error_hint;
        END;

        -- Create public.users record with admin role
        BEGIN
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
          );

          RAISE NOTICE 'SUCCESS: Created public.users record with team';
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
          RAISE EXCEPTION 'Failed to insert into public.users: % (Detail: %, Hint: %)', error_message, error_detail, error_hint;
        END;

        -- Increment invite code usage
        UPDATE invite_codes
        SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses;

        RAISE NOTICE 'SUCCESS: Incremented invite code usage';

      -- SCENARIO 2: Joining existing team
      ELSIF invite_team_id IS NOT NULL THEN
        RAISE NOTICE 'SCENARIO 2: Joining existing team %', invite_team_id;

        -- Create or update public.users with correct team info
        BEGIN
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

          RAISE NOTICE 'SUCCESS: Created/updated public.users record';
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
          RAISE EXCEPTION 'Failed to create/update user: % (Detail: %, Hint: %)', error_message, error_detail, error_hint;
        END;

        -- Increment invite code usage
        UPDATE invite_codes
        SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses;

        RAISE NOTICE 'SUCCESS: Incremented invite code usage';

      -- SCENARIO 3: New team invite - team name will be provided during onboarding
      -- This handles ALL cases where team_id IS NULL (new team invites)
      ELSE
        RAISE NOTICE 'SCENARIO 3: New team invite - user will create team during onboarding';

        -- Create public.users record WITHOUT team assignment
        BEGIN
          INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
          VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            NULL,  -- No team yet
            'admin',  -- Will be admin of their new team
            true,
            NEW.created_at,
            NEW.updated_at
          )
          ON CONFLICT (id) DO NOTHING;

          RAISE NOTICE 'SUCCESS: Created public.users record (pending team setup)';
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
          RAISE EXCEPTION 'Failed to create user: % (Detail: %, Hint: %)', error_message, error_detail, error_hint;
        END;

        -- DO NOT increment invite code yet - will be done when team is created during onboarding
        RAISE NOTICE 'Invite code NOT incremented - will be done during team creation';
      END IF;
    ELSE
      RAISE NOTICE 'No invite code provided, creating basic user record';

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

      RAISE NOTICE 'SUCCESS: Created basic user record';
    END IF;

    RAISE NOTICE '=== SIGNUP TRIGGER COMPLETE ===';
    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      error_message = MESSAGE_TEXT,
      error_detail = PG_EXCEPTION_DETAIL,
      error_hint = PG_EXCEPTION_HINT;

    RAISE WARNING '=== SIGNUP TRIGGER ERROR ===';
    RAISE WARNING 'Error for user %: %', NEW.id, error_message;
    RAISE WARNING 'Detail: %', error_detail;
    RAISE WARNING 'Hint: %', error_hint;
    RAISE WARNING '=============================';

    -- Re-raise with more context
    RAISE EXCEPTION 'Database error saving new user: %', error_message;
  END;
END;
$function$;
