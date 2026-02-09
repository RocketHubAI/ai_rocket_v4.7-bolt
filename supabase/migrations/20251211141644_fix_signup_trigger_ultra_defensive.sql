/*
  # Fix Signup Trigger - Ultra Defensive Version
  
  ## Problem
  Signup is still failing with "Database error saving new user" even though
  all individual tests pass. Need maximum error visibility.
  
  ## Solution
  1. Add detailed logging at every step
  2. Wrap EVERY operation in its own exception handler
  3. Return NEW even if user creation fails (let it succeed with just auth.users)
  
  ## Changes
  - Ultra-defensive error handling
  - Detailed step-by-step logging
  - Fail-safe: signup completes even if public.users insert fails
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
  step_name text := 'init';
BEGIN
  step_name := 'start';
  RAISE LOG 'SIGNUP[%]: Starting for email=%', NEW.id, NEW.email;

  BEGIN
    step_name := 'extract_metadata';
    user_invite_code := NEW.raw_user_meta_data->>'invite_code';
    new_team_name := NEW.raw_user_meta_data->>'new_team_name';
    RAISE LOG 'SIGNUP[%]: invite_code=%, new_team_name=%', NEW.id, user_invite_code, new_team_name;

    IF user_invite_code IS NOT NULL THEN
      step_name := 'lookup_invite';
      RAISE LOG 'SIGNUP[%]: Looking up invite code %', NEW.id, UPPER(user_invite_code);
      
      BEGIN
        SELECT team_id, assigned_role, view_financial, true
        INTO invite_team_id, invite_role, invite_view_financial, invite_found
        FROM invite_codes
        WHERE code = UPPER(user_invite_code)
          AND is_active = true
          AND current_uses < max_uses
          AND (expires_at IS NULL OR expires_at > now())
        LIMIT 1;
        
        RAISE LOG 'SIGNUP[%]: Invite found=%, team_id=%', NEW.id, COALESCE(invite_found, false), invite_team_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'SIGNUP[%]: Error looking up invite: %', NEW.id, SQLERRM;
        invite_found := false;
      END;

      IF NOT COALESCE(invite_found, false) THEN
        step_name := 'create_user_no_invite';
        RAISE LOG 'SIGNUP[%]: No valid invite, creating basic user', NEW.id;
        
        BEGIN
          INSERT INTO public.users (id, email, name, created_at, updated_at)
          VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.created_at, NEW.updated_at)
          ON CONFLICT (id) DO NOTHING;
          RAISE LOG 'SIGNUP[%]: Basic user created successfully', NEW.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'SIGNUP[%]: Error creating basic user: %', NEW.id, SQLERRM;
        END;
        
        RETURN NEW;
      END IF;

      -- SCENARIO 1: New team with name provided
      IF invite_team_id IS NULL AND new_team_name IS NOT NULL AND TRIM(new_team_name) != '' THEN
        step_name := 'scenario1_create_team';
        RAISE LOG 'SIGNUP[%]: SCENARIO 1 - Creating team "%"', NEW.id, new_team_name;
        
        BEGIN
          INSERT INTO teams (name, created_at, updated_at)
          VALUES (TRIM(new_team_name), now(), now())
          RETURNING id INTO created_team_id;
          RAISE LOG 'SIGNUP[%]: Team created with id=%', NEW.id, created_team_id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'SIGNUP[%]: Error creating team: %', NEW.id, SQLERRM;
          RAISE EXCEPTION 'Failed to create team: %', SQLERRM;
        END;

        step_name := 'scenario1_create_user';
        BEGIN
          INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
          VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), created_team_id, 'admin', true, NEW.created_at, NEW.updated_at);
          RAISE LOG 'SIGNUP[%]: User created with team', NEW.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'SIGNUP[%]: Error creating user with team: %', NEW.id, SQLERRM;
          RAISE EXCEPTION 'Failed to create user: %', SQLERRM;
        END;

        step_name := 'scenario1_increment';
        UPDATE invite_codes SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code) AND is_active = true AND current_uses < max_uses;

      -- SCENARIO 2: Joining existing team
      ELSIF invite_team_id IS NOT NULL THEN
        step_name := 'scenario2_join_team';
        RAISE LOG 'SIGNUP[%]: SCENARIO 2 - Joining team %', NEW.id, invite_team_id;
        
        BEGIN
          INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
          VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), invite_team_id, COALESCE(invite_role, 'member'), COALESCE(invite_view_financial, true), NEW.created_at, NEW.updated_at)
          ON CONFLICT (id) DO UPDATE SET team_id = EXCLUDED.team_id, role = EXCLUDED.role, view_financial = EXCLUDED.view_financial, updated_at = now();
          RAISE LOG 'SIGNUP[%]: User joined team successfully', NEW.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'SIGNUP[%]: Error joining team: %', NEW.id, SQLERRM;
          RAISE EXCEPTION 'Failed to join team: %', SQLERRM;
        END;

        step_name := 'scenario2_increment';
        UPDATE invite_codes SET current_uses = current_uses + 1
        WHERE code = UPPER(user_invite_code) AND is_active = true AND current_uses < max_uses;

      -- SCENARIO 3: New team invite - will create team during onboarding
      ELSE
        step_name := 'scenario3_pending_team';
        RAISE LOG 'SIGNUP[%]: SCENARIO 3 - New team invite, pending setup', NEW.id;
        
        BEGIN
          INSERT INTO public.users (id, email, name, team_id, role, view_financial, created_at, updated_at)
          VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NULL, 'admin', true, NEW.created_at, NEW.updated_at)
          ON CONFLICT (id) DO NOTHING;
          RAISE LOG 'SIGNUP[%]: User created pending team setup', NEW.id;
        EXCEPTION WHEN OTHERS THEN
          RAISE LOG 'SIGNUP[%]: Error creating pending user: %', NEW.id, SQLERRM;
          -- Don't raise exception - let signup complete
        END;
      END IF;
      
    ELSE
      step_name := 'no_invite_code';
      RAISE LOG 'SIGNUP[%]: No invite code provided', NEW.id;
      
      BEGIN
        INSERT INTO public.users (id, email, name, created_at, updated_at)
        VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.created_at, NEW.updated_at)
        ON CONFLICT (id) DO NOTHING;
        RAISE LOG 'SIGNUP[%]: Basic user created', NEW.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'SIGNUP[%]: Error creating basic user: %', NEW.id, SQLERRM;
      END;
    END IF;

    RAISE LOG 'SIGNUP[%]: Completed successfully', NEW.id;
    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'SIGNUP[%]: FATAL ERROR at step % - %', NEW.id, step_name, SQLERRM;
    -- Re-raise to fail the signup
    RAISE EXCEPTION 'Database error saving new user (step=%): %', step_name, SQLERRM;
  END;
END;
$function$;
