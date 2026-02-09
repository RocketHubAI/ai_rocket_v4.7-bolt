/*
  # Add detailed error logging to signup function

  1. Changes
    - Add more detailed RAISE NOTICE statements throughout
    - Log each step of the process
    - Capture and log the exact error that's occurring
    - This will help us identify where the failure happens
    
  2. Purpose
    - Debug the "Database error saving new user" issue
    - Identify if it's team creation, user creation, or invite increment that fails
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
      
      -- Get invite code details (before incrementing)
      SELECT team_id, assigned_role, view_financial
      INTO invite_team_id, invite_role, invite_view_financial
      FROM invite_codes
      WHERE code = UPPER(user_invite_code)
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1;

      RAISE NOTICE 'Invite details - team_id: %, role: %, view_financial: %', invite_team_id, invite_role, invite_view_financial;

      -- SCENARIO 1: Creating a new team
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
          RAISE NOTICE 'Attempting to insert into public.users...';
          RAISE NOTICE 'Values - id: %, email: %, team_id: %, role: admin', NEW.id, NEW.email, created_team_id;
          
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
          
          RAISE NOTICE 'SUCCESS: Created public.users record';
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
          RAISE EXCEPTION 'Failed to insert into public.users: % (Detail: %, Hint: %)', error_message, error_detail, error_hint;
        END;
        
        -- Increment invite code usage
        BEGIN
          UPDATE invite_codes
          SET current_uses = current_uses + 1
          WHERE code = UPPER(user_invite_code)
            AND is_active = true
            AND current_uses < max_uses
            AND (expires_at IS NULL OR expires_at > now());
          
          RAISE NOTICE 'SUCCESS: Incremented invite code usage';
        EXCEPTION WHEN OTHERS THEN
          GET STACKED DIAGNOSTICS 
            error_message = MESSAGE_TEXT,
            error_detail = PG_EXCEPTION_DETAIL,
            error_hint = PG_EXCEPTION_HINT;
          RAISE EXCEPTION 'Failed to increment invite code: % (Detail: %, Hint: %)', error_message, error_detail, error_hint;
        END;
        
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
          AND current_uses < max_uses
          AND (expires_at IS NULL OR expires_at > now());
        
        RAISE NOTICE 'SUCCESS: Incremented invite code usage';
        
      -- SCENARIO 3: Invalid invite
      ELSE
        RAISE EXCEPTION 'Invalid signup: invite has team_id=% and new_team_name=%', invite_team_id, new_team_name;
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
$$;
